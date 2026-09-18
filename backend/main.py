"""
康医助手 - 后端服务
提供流式对话、图片分析、健康建议、食谱推荐、就医指引、养生视频等接口。

AI 能力由阿里云百炼·通义千问（qwen-plus / qwen-vl-max）提供，经 llm_client 统一调用；
未配置 DASHSCOPE_API_KEY 时显式降级到内置医学知识库（离线模式）。
所有回复均附带医疗免责声明。
"""
import json
import time
import random
import asyncio
import io
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image

import llm_client
from llm_client import LLM_ENABLED, CHAT_MODEL, VISION_MODEL

app = FastAPI(title="康医助手 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# 容器健康探针（Cloudflare Containers 启动时会轮询根路径）
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"status": "ok", "service": "康医助手 API", "docs": "/docs", "health": "/api/health"}


@app.get("/ping")
async def ping():
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# 医学知识库：症状 -> 可能疾病方向 + 建议
# ---------------------------------------------------------------------------
SYMPTOM_KNOWLEDGE = {
    "头痛": {
        "possible": ["紧张性头痛", "偏头痛", "高血压相关头痛", "颈椎病引起头痛", "感冒发热"],
        "severity": "多数可居家观察；若出现剧烈头痛、呕吐、视物模糊、肢体无力，请立即就医",
        "advice": [
            "保持充足睡眠，避免熬夜和过度劳累",
            "减少咖啡因摄入，规律饮食",
            "若头痛反复发作或持续加重，建议神经内科就诊",
            "测量血压，排除高血压因素",
        ],
        "red_flags": ["突发剧烈头痛", "伴意识障碍", "伴肢体偏瘫", "伴喷射性呕吐"],
    },
    "咳嗽": {
        "possible": ["上呼吸道感染", "急性支气管炎", "过敏性咳嗽", "胃食管反流", "咳嗽变异性哮喘"],
        "severity": "若咳嗽持续超过 2 周或伴咯血、呼吸困难，建议就医",
        "advice": [
            "多饮温水，保持室内湿度适宜",
            "避免吸烟和二手烟，远离刺激性气味",
            "干咳可尝试蜂蜜水（1 岁以上），有痰需化痰",
            "若伴发热、脓痰或喘息，建议呼吸内科就诊",
        ],
        "red_flags": ["咯血", "呼吸困难", "高热不退", "胸痛"],
    },
    "胃痛": {
        "possible": ["急性胃炎", "消化性溃疡", "胃食管反流", "功能性消化不良", "胆囊疾病"],
        "severity": "若出现剧烈腹痛、呕血、黑便，需立即就医",
        "advice": [
            "清淡饮食，避免辛辣、油腻、生冷食物",
            "少食多餐，避免空腹过长",
            "戒烟限酒，减少咖啡浓茶",
            "若疼痛持续或反复发作，建议消化内科就诊",
        ],
        "red_flags": ["呕血", "黑便", "剧烈腹痛", "伴发热黄疸"],
    },
    "发热": {
        "possible": ["上呼吸道感染", "流感", "尿路感染", "炎症反应"],
        "severity": "38.5℃以下可物理降温；持续高热或伴意识改变需就医",
        "advice": [
            "多饮水，注意休息",
            "温水擦浴物理降温",
            "体温超过 38.5℃ 可考虑退热药（如对乙酰氨基酚）",
            "发热超过 3 天或伴其他严重症状，建议就医",
        ],
        "red_flags": ["体温超过 39.5℃", "伴意识模糊", "伴抽搐", "婴幼儿发热"],
    },
    "失眠": {
        "possible": ["入睡困难", "睡眠维持障碍", "焦虑抑郁相关", "作息不规律"],
        "severity": "慢性失眠（持续 1 个月以上）建议就医",
        "advice": [
            "固定作息时间，即使周末也保持一致",
            "睡前 1 小时避免电子屏幕",
            "避免下午后摄入咖啡因",
            "规律运动，但避免睡前剧烈运动",
            "若持续困扰，建议神经内科或心理科就诊",
        ],
        "red_flags": ["伴严重焦虑抑郁", "伴呼吸暂停", "影响日间功能"],
    },
    "腹泻": {
        "possible": ["急性胃肠炎", "食物中毒", "肠易激综合征", "肠道感染"],
        "severity": "若出现脱水、血便、持续高热，需就医",
        "advice": [
            "补充水分和电解质（口服补液盐）",
            "清淡饮食，避免油腻和乳制品",
            "注意手卫生，防止交叉感染",
            "若持续超过 3 天或伴血便，建议消化内科就诊",
        ],
        "red_flags": ["血便", "严重脱水", "持续高热", "剧烈腹痛"],
    },
    "高血压": {
        "possible": ["原发性高血压", "继发性高血压（肾性、内分泌性等）"],
        "severity": "血压持续 ≥ 140/90 mmHg 建议就医评估；≥ 180/120 mmHg 需紧急处理",
        "advice": [
            "低盐饮食（每日 < 5g 盐）",
            "规律有氧运动（每周 ≥ 150 分钟中等强度）",
            "控制体重，戒烟限酒",
            "定期监测血压，记录变化",
            "遵医嘱服药，不可自行停药",
        ],
        "red_flags": ["血压 ≥ 180/120", "伴头痛胸痛", "伴视物模糊", "伴肢体无力"],
    },
    "糖尿病": {
        "possible": ["2 型糖尿病", "1 型糖尿病", "糖耐量异常"],
        "severity": "空腹血糖 ≥ 7.0 mmol/L 或餐后 ≥ 11.1 mmol/L 建议就医",
        "advice": [
            "控制碳水摄入，选择低 GI 食物",
            "规律监测空腹及餐后血糖",
            "餐后适度运动（如散步 30 分钟）",
            "遵医嘱用药或注射胰岛素",
            "定期检查眼底、肾功能、足部",
        ],
        "red_flags": ["血糖 > 16.7 mmol/L", "伴酮症症状", "意识改变", "严重低血糖"],
    },
}

CONDITION_ADVICE = {
    "高血压": {
        "lifestyle": "低盐低脂饮食，每日盐摄入 < 5g；每周 ≥ 150 分钟中等强度有氧运动（快走、游泳、骑行）；戒烟限酒；控制体重（BMI 18.5-23.9）；减少精神压力。",
        "monitoring": "建议每天早晚各测一次血压并记录，目标值一般 < 140/90 mmHg，糖尿病/肾病患者 < 130/80 mmHg。",
        "medication": "遵医嘱规律服药，不可自行停药或调整剂量。常见药物包括钙通道阻滞剂、ACEI/ARB、利尿剂等。",
        "risks": "警惕脑卒中、心肌梗死、肾损害等并发症。若血压 ≥ 180/120 mmHg 或伴头痛、胸痛、视物模糊，立即就医。",
    },
    "糖尿病": {
        "lifestyle": "控制总热量，低 GI 饮食，定时定量；餐后 30 分钟散步；戒烟限酒；保持口腔卫生。",
        "monitoring": "监测空腹及餐后 2 小时血糖，糖化血红蛋白每 3 个月检测一次。空腹目标 4.4-7.0 mmol/L，餐后 < 10.0 mmol/L。",
        "medication": "口服降糖药或胰岛素治疗须严格遵医嘱，注意预防低血糖。",
        "risks": "警惕低血糖反应（心悸、出汗、手抖），定期筛查视网膜病变、肾病、神经病变、足部溃疡。",
    },
    "高血脂": {
        "lifestyle": "减少饱和脂肪和反式脂肪摄入，增加膳食纤维、深海鱼、坚果；每周 ≥ 150 分钟有氧运动；戒烟限酒。",
        "monitoring": "每 3-6 个月复查血脂四项（TC、TG、LDL-C、HDL-C）。",
        "medication": "他汀类药物是常用降脂药，须遵医嘱服用并监测肝功能和肌酸激酶。",
        "risks": "长期高血脂增加动脉粥样硬化、冠心病、脑卒中风险。",
    },
    "冠心病": {
        "lifestyle": "低盐低脂饮食，避免饱餐和情绪激动；适度有氧运动（以不诱发心绞痛为度）；戒烟限酒；保持大便通畅。",
        "monitoring": "随身携带硝酸甘油等急救药物；记录心绞痛发作频率和诱因。",
        "medication": "抗血小板（阿司匹林）、调脂（他汀）、β受体阻滞剂等须长期遵医嘱服用。",
        "risks": "若出现持续胸痛 > 15 分钟、大汗、濒死感，立即拨打 120，警惕急性心肌梗死。",
    },
    "高尿酸": {
        "lifestyle": "低嘌呤饮食，避免动物内脏、海鲜、浓肉汤、啤酒；每日饮水 ≥ 2000ml；控制体重；避免剧烈运动和受凉。",
        "monitoring": "定期检测血尿酸，目标值 < 360 μmol/L（有痛风石者 < 300）。",
        "medication": "降尿酸药（别嘌醇、非布司他）和促排泄药（苯溴马隆）须遵医嘱。",
        "risks": "长期高尿酸可致痛风性关节炎、肾结石、肾损害。急性发作时表现为关节红肿热痛。",
    },
    "脂肪肝": {
        "lifestyle": "控制体重（减重 5%-10%），低脂低糖饮食，避免饮酒；规律有氧运动；避免滥用药物。",
        "monitoring": "每 6-12 个月复查肝功能、腹部 B 超。",
        "medication": "目前无特效药物，以生活方式干预为主，必要时遵医嘱使用保肝药。",
        "risks": "若不干预，可进展为脂肪性肝炎、肝纤维化，甚至肝硬化。",
    },
    "慢性胃炎": {
        "lifestyle": "规律饮食，细嚼慢咽，避免辛辣刺激、过冷过热食物；戒烟限酒；减少 NSAIDs 类药物使用。",
        "monitoring": "幽门螺杆菌阳性者建议根除治疗；定期复查胃镜。",
        "medication": "抑酸药（PPI）、胃黏膜保护剂等遵医嘱使用。",
        "risks": "长期慢性萎缩性胃炎伴肠化生有一定癌变风险，需定期随访。",
    },
    "哮喘": {
        "lifestyle": "避免过敏原（尘螨、花粉、宠物毛屑）；避免冷空气刺激和剧烈运动；戒烟。",
        "monitoring": "记录哮喘日记，使用峰流速仪监测；规律使用控制药物。",
        "medication": "吸入糖皮质激素是控制哮喘的基础，急救用短效 β2 受体激动剂（如沙丁胺醇）。",
        "risks": "急性发作时若用药不缓解，需立即就医；严重发作可危及生命。",
    },
}

# ---------------------------------------------------------------------------
# 食谱库
# ---------------------------------------------------------------------------
RECIPES_DB = [
    {
        "name": "燕麦牛奶粥",
        "meal": "早餐",
        "calories": 280,
        "tags": ["低脂", "高纤维", "控糖"],
        "ingredients": ["燕麦片 40g", "低脂牛奶 200ml", "蓝莓少许"],
        "steps": ["燕麦片与牛奶同煮 3 分钟", "出锅前加入蓝莓即可"],
        "suitable": ["糖尿病", "高血脂", "高血压"],
    },
    {
        "name": "全麦三明治",
        "meal": "早餐",
        "calories": 320,
        "tags": ["低脂", "高蛋白"],
        "ingredients": ["全麦面包 2 片", "水煮蛋 1 个", "生菜", "番茄"],
        "steps": ["面包烤至微脆", "依次夹入生菜、番茄、水煮蛋"],
        "suitable": ["高血压", "高血脂", "脂肪肝"],
    },
    {
        "name": "清蒸鲈鱼",
        "meal": "午餐",
        "calories": 220,
        "tags": ["高蛋白", "低脂", "低盐"],
        "ingredients": ["鲈鱼 1 条", "葱", "姜", "蒸鱼豉油少许"],
        "steps": ["鱼处理干净，铺上葱姜", "大火蒸 8-10 分钟", "淋少许蒸鱼豉油"],
        "suitable": ["高血压", "糖尿病", "高血脂", "冠心病"],
    },
    {
        "name": "杂粮糙米饭",
        "meal": "午餐",
        "calories": 350,
        "tags": ["低 GI", "高纤维", "控糖"],
        "ingredients": ["糙米", "藜麦", "红豆", "燕麦"],
        "steps": ["杂粮提前浸泡 4 小时", "按 1:1.5 比例加水煮熟"],
        "suitable": ["糖尿病", "高血脂", "脂肪肝"],
    },
    {
        "name": "清炒西兰花",
        "meal": "午餐",
        "calories": 90,
        "tags": ["低脂", "高维生素", "低盐"],
        "ingredients": ["西兰花", "蒜末", "橄榄油少许"],
        "steps": ["西兰花焯水 1 分钟", "蒜末爆香后快速翻炒", "少许盐调味"],
        "suitable": ["高血压", "糖尿病", "高血脂", "脂肪肝"],
    },
    {
        "name": "冬瓜薏仁汤",
        "meal": "晚餐",
        "calories": 80,
        "tags": ["低脂", "利尿", "消肿"],
        "ingredients": ["冬瓜", "薏仁", "姜"],
        "steps": ["薏仁提前浸泡", "与冬瓜同煮 30 分钟", "少许盐调味"],
        "suitable": ["高血压", "高尿酸", "脂肪肝"],
    },
    {
        "name": "番茄豆腐汤",
        "meal": "晚餐",
        "calories": 150,
        "tags": ["低脂", "高蛋白", "低盐"],
        "ingredients": ["番茄", "嫩豆腐", "鸡蛋"],
        "steps": ["番茄炒出汁", "加水煮沸后下豆腐", "淋入蛋液，少许盐调味"],
        "suitable": ["高血压", "糖尿病", "高血脂", "冠心病"],
    },
    {
        "name": "凉拌芹菜木耳",
        "meal": "加餐",
        "calories": 60,
        "tags": ["降压", "低脂", "高纤维"],
        "ingredients": ["芹菜", "黑木耳", "蒜末", "醋"],
        "steps": ["芹菜木耳焯水", "加蒜末、醋、少许香油拌匀"],
        "suitable": ["高血压", "高血脂"],
    },
    {
        "name": "希腊酸奶坚果",
        "meal": "加餐",
        "calories": 180,
        "tags": ["高蛋白", "益生菌"],
        "ingredients": ["无糖希腊酸奶", "杏仁", "核桃"],
        "steps": ["酸奶中加入坚果即可"],
        "suitable": ["糖尿病", "高血脂"],
    },
    {
        "name": "紫薯山药泥",
        "meal": "加餐",
        "calories": 160,
        "tags": ["低 GI", "高纤维"],
        "ingredients": ["紫薯", "山药"],
        "steps": ["紫薯山药蒸熟", "压成泥即可"],
        "suitable": ["糖尿病", "高血脂", "高血压"],
    },
]

# ---------------------------------------------------------------------------
# 医院与医生数据（示例数据，实际应来自权威数据源）
# ---------------------------------------------------------------------------
HOSPITALS = [
    {"name": "市第一人民医院", "level": "三甲", "distance": "2.3 km", "address": "健康路 1 号", "depts": ["心内科", "神经内科", "呼吸内科", "消化内科", "内分泌科"]},
    {"name": "市中心医院", "level": "三甲", "distance": "4.1 km", "address": "解放大道 88 号", "depts": ["心内科", "呼吸内科", "急诊科", "内分泌科"]},
    {"name": "市中医院", "level": "三甲", "distance": "3.5 km", "address": "文化路 56 号", "depts": ["中医内科", "针灸科", "推拿科"]},
    {"name": "区人民医院", "level": "二甲", "distance": "1.2 km", "address": "民生路 20 号", "depts": ["内科", "外科", "儿科", "急诊科"]},
    {"name": "心血管病医院", "level": "三甲专科", "distance": "5.8 km", "address": "心康路 8 号", "depts": ["心内科", "心外科", "高血压科"]},
]

DOCTORS_DB = [
    {"name": "张明", "title": "主任医师", "dept": "心内科", "hospital": "市第一人民医院", "specialty": "高血压、冠心病、心律失常", "rating": 4.9},
    {"name": "李华", "title": "副主任医师", "dept": "神经内科", "hospital": "市第一人民医院", "specialty": "头痛、脑血管病、癫痫", "rating": 4.8},
    {"name": "王芳", "title": "主任医师", "dept": "呼吸内科", "hospital": "市中心医院", "specialty": "慢性咳嗽、哮喘、慢阻肺", "rating": 4.7},
    {"name": "陈强", "title": "副主任医师", "dept": "消化内科", "hospital": "市第一人民医院", "specialty": "胃炎、溃疡、胃肠功能紊乱", "rating": 4.6},
    {"name": "刘洋", "title": "主任医师", "dept": "内分泌科", "hospital": "市中心医院", "specialty": "糖尿病、甲状腺疾病、痛风", "rating": 4.9},
    {"name": "赵雪", "title": "主治医师", "dept": "中医内科", "hospital": "市中医院", "specialty": "失眠、亚健康调理", "rating": 4.5},
]

DEPT_MAP = {
    "头痛": ["神经内科", "心血管内科"],
    "咳嗽": ["呼吸内科", "耳鼻喉科"],
    "胃痛": ["消化内科"],
    "发热": ["发热门诊", "感染科"],
    "失眠": ["神经内科", "心理科"],
    "腹泻": ["消化内科", "感染科"],
    "高血压": ["心内科", "高血压科"],
    "糖尿病": ["内分泌科"],
    "胸痛": ["心内科", "急诊科"],
    "腹痛": ["消化内科", "普通外科"],
    "皮疹": ["皮肤科"],
    "关节痛": ["骨科", "风湿免疫科"],
}

# ---------------------------------------------------------------------------
# 养生视频库（模拟抖音养生科普视频）
# ---------------------------------------------------------------------------
VIDEOS_DB = [
    {"id": "v1", "title": "中医教你 3 个穴位缓解头痛，在家就能按", "author": "养生堂", "cover": "https://picsum.photos/seed/headache1/400/225", "url": "https://www.douyin.com", "duration": "03:25", "views": "125万", "tags": ["头痛", "穴位", "中医"], "symptoms": ["头痛"]},
    {"id": "v2", "title": "高血压患者必看：日常饮食 5 个误区", "author": "健康中国", "cover": "https://picsum.photos/seed/bp2/400/225", "url": "https://www.douyin.com", "duration": "04:10", "views": "89万", "tags": ["高血压", "饮食"], "symptoms": ["高血压"]},
    {"id": "v3", "title": "止咳化痰的 4 种天然食物，比吃药还管用", "author": "食疗养生", "cover": "https://picsum.photos/seed/cough3/400/225", "url": "https://www.douyin.com", "duration": "02:58", "views": "210万", "tags": ["咳嗽", "食疗"], "symptoms": ["咳嗽"]},
    {"id": "v4", "title": "糖尿病控糖指南：这 6 种食物放心吃", "author": "糖友之家", "cover": "https://picsum.photos/seed/diabetes4/400/225", "url": "https://www.douyin.com", "duration": "05:12", "views": "156万", "tags": ["糖尿病", "控糖"], "symptoms": ["糖尿病"]},
    {"id": "v5", "title": "长期失眠？教你一套睡前放松操", "author": "睡眠博士", "cover": "https://picsum.photos/seed/sleep5/400/225", "url": "https://www.douyin.com", "duration": "06:30", "views": "340万", "tags": ["失眠", "放松"], "symptoms": ["失眠"]},
    {"id": "v6", "title": "养胃护胃：医生推荐的 7 天食谱", "author": "消化科李医生", "cover": "https://picsum.photos/seed/stomach6/400/225", "url": "https://www.douyin.com", "duration": "04:45", "views": "98万", "tags": ["胃病", "食谱"], "symptoms": ["胃痛"]},
    {"id": "v7", "title": "高血脂人群每天一杯这个茶，血管更通畅", "author": "心血管王医生", "cover": "https://picsum.photos/seed/lipid7/400/225", "url": "https://www.douyin.com", "duration": "03:50", "views": "178万", "tags": ["高血脂", "茶饮"], "symptoms": ["高血脂"]},
    {"id": "v8", "title": "每天 10 分钟八段锦，强身健体", "author": "传统养生", "cover": "https://picsum.photos/seed/qigong8/400/225", "url": "https://www.douyin.com", "duration": "10:00", "views": "520万", "tags": ["运动", "八段锦"], "symptoms": []},
    {"id": "v9", "title": "高尿酸痛风患者，这些食物千万别碰", "author": "风湿科张医生", "cover": "https://picsum.photos/seed/gout9/400/225", "url": "https://www.douyin.com", "duration": "04:20", "views": "145万", "tags": ["痛风", "高尿酸"], "symptoms": ["高尿酸"]},
    {"id": "v10", "title": "脂肪肝如何逆转？医生讲透了", "author": "肝病科普", "cover": "https://picsum.photos/seed/liver10/400/225", "url": "https://www.douyin.com", "duration": "05:30", "views": "112万", "tags": ["脂肪肝"], "symptoms": ["脂肪肝"]},
    {"id": "v11", "title": "腹泻脱水怎么办？口服补液盐正确用法", "author": "急诊陈医生", "cover": "https://picsum.photos/seed/diarrhea11/400/225", "url": "https://www.douyin.com", "duration": "03:15", "views": "67万", "tags": ["腹泻", "脱水"], "symptoms": ["腹泻"]},
    {"id": "v12", "title": "秋冬呼吸道养护：3 个简单方法", "author": "呼吸健康", "cover": "https://picsum.photos/seed/respiratory12/400/225", "url": "https://www.douyin.com", "duration": "02:40", "views": "203万", "tags": ["呼吸道", "秋冬"], "symptoms": ["咳嗽"]},
]

DISCLAIMER = "\n\n---\n> ⚠️ **免责声明**：以上内容由 AI 生成，仅供健康参考，**不构成医疗诊断或治疗建议**。如有不适请及时就医，紧急情况请拨打 120。"

# ---------------------------------------------------------------------------
# 请求模型
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    images: List[str] = []

class HealthProfileReq(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    conditions: List[str] = []
    medications: List[str] = []
    allergies: List[str] = []

# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------
def match_symptom(text: str) -> Optional[str]:
    for sym in SYMPTOM_KNOWLEDGE:
        if sym in text:
            return sym
    # 模糊匹配常见关键词
    keyword_map = {
        "头疼": "头痛", "偏头痛": "头痛",
        "咳": "咳嗽", "喉咙": "咳嗽",
        "胃": "胃痛", "肚子": "胃痛", "肚子痛": "胃痛",
        "发烧": "发热", "高烧": "发热", "烧": "发热",
        "睡不着": "失眠", "睡眠": "失眠",
        "拉肚子": "腹泻", "拉稀": "腹泻",
        "血压": "高血压",
        "血糖": "糖尿病", "糖": "糖尿病",
        "尿酸": "高尿酸", "痛风": "高尿酸",
        "血脂": "高血脂",
        "肝": "脂肪肝",
    }
    for kw, sym in keyword_map.items():
        if kw in text:
            return sym
    return None


def generate_chat_response(user_text: str, has_images: bool) -> str:
    """生成医学回复内容（模拟 AI）"""
    if has_images:
        base = "已收到您上传的图片。需要说明的是，图片分析仅作初步参考，不能替代医生面诊。\n\n"
        base += "从图片中我注意到一些特征，以下是一般性的健康提示：\n"
        base += "1. 请注意观察图片中所示部位的变化趋势\n"
        base += "2. 若有红肿、疼痛加剧、渗液等情况，建议尽快到皮肤科或相关科室就诊\n"
        base += "3. 请勿自行用药，以免延误或加重病情\n"
        base += DISCLAIMER
        return base

    symptom = match_symptom(user_text)
    if not symptom:
        # 通用回复
        response = "感谢您的咨询。为了给您更有针对性的建议，请补充以下信息：\n\n"
        response += "- **症状部位**：具体哪里不舒服？\n"
        response += "- **持续时间**：这种情况有多久了？\n"
        response += "- **严重程度**：轻微 / 中度 / 重度？是否影响日常生活？\n"
        response += "- **伴随症状**：是否还有其他不适（如发热、乏力等）？\n"
        response += "- **既往病史**：是否有基础疾病或正在服药？\n\n"
        response += "您描述得越详细，我给出的建议越有参考价值。当然，最终诊断请以医生面诊为准。"
        response += DISCLAIMER
        return response

    info = SYMPTOM_KNOWLEDGE[symptom]
    response = f"根据您描述的「{symptom}」相关症状，以下是初步分析：\n\n"

    response += "### 🩺 可能的疾病方向（仅供参考）\n"
    for i, p in enumerate(info["possible"], 1):
        response += f"{i}. {p}\n"

    response += f"\n### ⚠️ 严重程度初判\n{info['severity']}\n"

    response += "\n### 🚨 需警惕的危险信号（出现请立即就医）\n"
    for flag in info["red_flags"]:
        response += f"- {flag}\n"

    response += "\n### 💡 居家护理建议\n"
    for a in info["advice"]:
        response += f"- {a}\n"

    response += DISCLAIMER
    return response


# ---------------------------------------------------------------------------
# API 路由
# ---------------------------------------------------------------------------
@app.get("/api/config")
async def get_config():
    """前端用于感知当前 AI 能力状态"""
    return {
        "llm_enabled": LLM_ENABLED,
        "chat_model": CHAT_MODEL if LLM_ENABLED else None,
        "vision_model": VISION_MODEL if LLM_ENABLED else None,
        "mode": "cloud-llm" if LLM_ENABLED else "local-fallback",
    }


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """流式对话接口（SSE）：优先走通义千问，未配置 Key 时降级本地知识库"""
    user_text = req.messages[-1].content if req.messages else ""
    has_images = len(req.images) > 0

    async def event_generator():
        if LLM_ENABLED:
            try:
                # 真实大模型 token 级流式输出
                async for token in llm_client.stream_chat(
                    [m.model_dump() for m in req.messages],
                    req.images or None,
                ):
                    yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception:
                # 流式中途异常已在客户端内转为提示 token，直接收尾
                yield "data: [DONE]\n\n"
                return

        # —— 离线降级：本地知识库模拟流式（显式降级，非伪装）——
        full_response = generate_chat_response(user_text, has_images)
        chunks = split_for_streaming(full_response)
        for chunk in chunks:
            yield f"data: {json.dumps({'token': chunk}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.04)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def split_for_streaming(text: str) -> List[str]:
    """将文本切分为适合流式输出的片段（仅离线降级使用）"""
    chunks = []
    current = ""
    for char in text:
        current += char
        if len(current) >= 2 or char in "\n。！？；，、.?!,":
            chunks.append(current)
            current = ""
    if current:
        chunks.append(current)
    return chunks


@app.post("/api/image/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """图片分析接口：qwen-vl-max 多模态识别，未配置时返回元信息降级"""
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        width, height = img.size
        fmt = img.format
        mime = file.content_type or "image/jpeg"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片处理失败: {str(e)}")

    if LLM_ENABLED:
        try:
            analysis = await llm_client.analyze_image_bytes(contents, mime)
            return {
                "description": analysis,
                "warnings": [
                    "图片分析结果不能作为诊断依据",
                    "如有异常请携带原图到医院就诊",
                    "化验单结果以医院正式报告为准",
                ],
                "disclaimer": "本分析由通义千问多模态模型生成，仅供参考，不构成医疗诊断。",
            }
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"视觉模型调用失败: {str(e)}")

    return {
        "description": (
            f"已接收图片（{fmt} 格式，{width}×{height}）。当前为离线模式，"
            "配置 DASHSCOPE_API_KEY 后将启用通义千问视觉模型识别皮肤症状、化验单与药品信息。"
        ),
        "warnings": ["图片分析结果不能作为诊断依据", "如有异常请携带原图到医院就诊"],
        "disclaimer": "本分析为 AI 辅助识别，不构成医疗诊断。",
    }


@app.get("/api/videos/daily")
async def daily_videos():
    """每日推荐养生视频"""
    shuffled = random.sample(VIDEOS_DB, min(6, len(VIDEOS_DB)))
    return shuffled


@app.get("/api/videos/recommend")
async def recommend_videos(symptom: str = Query(..., description="病症关键词")):
    """根据病症推荐相关养生视频"""
    matched = [v for v in VIDEOS_DB if symptom in v["tags"] or symptom in v.get("symptoms", [])]
    if not matched:
        # 模糊匹配
        matched = [v for v in VIDEOS_DB if any(symptom in tag for tag in v["tags"])]
    if not matched:
        matched = random.sample(VIDEOS_DB, min(6, len(VIDEOS_DB)))
    return matched[:8]


@app.get("/api/medical/guidance")
async def medical_guidance(symptom: str = Query(...)):
    """就医指引"""
    # 推荐科室
    departments = DEPT_MAP.get(symptom, ["内科"])

    # 筛选医院（有相关科室的）
    hospitals = [h for h in HOSPITALS if any(d in h["depts"] for d in departments)]
    if not hospitals:
        hospitals = HOSPITALS[:3]

    # 筛选医生
    doctors = [d for d in DOCTORS_DB if d["dept"] in departments or symptom in d["specialty"]]
    if not doctors:
        doctors = DOCTORS_DB[:4]

    # 加头像
    doctors_with_avatar = []
    for d in doctors:
        seed = d["name"]
        doctors_with_avatar.append({
            **d,
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={seed}&backgroundColor=13a18a",
        })

    preparation = [
        "携带身份证、医保卡",
        "准备好既往病历、检查报告、化验单",
        "记录症状出现时间、变化情况",
        "列出正在服用的药物清单",
        "空腹就诊（如需抽血检查）",
        "提前预约挂号，减少等待时间",
    ]

    return {
        "departments": departments,
        "hospitals": hospitals[:4],
        "doctors": doctors_with_avatar[:4],
        "preparation": preparation,
    }


@app.post("/api/health/advice")
async def health_advice(profile: HealthProfileReq):
    """基础病健康建议：大模型个性化生成，失败/离线时降级本地知识库"""
    if not profile.conditions:
        return {
            "advice": "您暂未填写基础疾病。建议先在「健康档案」中完善您的健康信息，以便获得个性化建议。\n\n同时，无论是否有基础病，以下通用健康建议都适用：\n\n- 均衡饮食：多蔬果、少油腻、控盐糖\n- 规律运动：每周 ≥ 150 分钟中等强度有氧运动\n- 充足睡眠：每天 7-8 小时\n- 戒烟限酒\n- 定期体检：每年一次全面体检\n- 保持良好心态\n\n> ⚠️ 以上为通用建议，具体健康管理请咨询专业医生。"
        }

    if LLM_ENABLED:
        profile_text = (
            f"年龄：{profile.age or '未填'}；性别：{profile.gender or '未填'}；"
            f"身高：{profile.height or '未填'}cm；体重：{profile.weight or '未填'}kg\n"
            f"基础疾病：{'、'.join(profile.conditions) or '无'}\n"
            f"常用药物：{'、'.join(profile.medications) or '无'}\n"
            f"过敏史：{'、'.join(profile.allergies) or '无'}"
        )
        prompt = (
            "请基于以下用户健康档案，生成个性化的基础病管理建议，"
            "针对每种基础病分别从「生活方式」「日常监测（含目标值/频率）」「用药提醒（必须提示遵医嘱，不得给处方）」"
            "「异常信号与并发症风险」四个方面展开；有过敏史要单独提醒。使用 Markdown 排版。\n\n"
            f"【健康档案】\n{profile_text}"
        )
        try:
            advice = await llm_client.generate_text(prompt)
            return {"advice": advice, "source": CHAT_MODEL}
        except Exception:
            pass  # 静默降级到本地知识库

    # —— 离线降级 ——
    response = f"根据您的健康档案（基础病：{'、'.join(profile.conditions)}），以下是个性化健康建议：\n\n"
    for cond in profile.conditions:
        advice = CONDITION_ADVICE.get(cond)
        if advice:
            response += f"## 🏥 {cond}\n\n"
            response += f"### 生活方式\n{advice['lifestyle']}\n\n"
            response += f"### 日常监测\n{advice['monitoring']}\n\n"
            response += f"### 用药提醒\n{advice['medication']}\n\n"
            response += f"### 风险提示\n{advice['risks']}\n\n"
        else:
            response += f"## 🏥 {cond}\n\n建议您咨询专科医生获取针对性建议，并定期复查相关指标。\n\n"
    if profile.allergies:
        response += f"### ⚠️ 过敏提醒\n您对以下物质过敏，请注意避免：{'、'.join(profile.allergies)}\n\n"
    response += DISCLAIMER
    return {"advice": response, "source": "local-fallback"}


def _local_recipes(conditions: List[str], allergies: List[str]) -> List[dict]:
    """本地食谱库筛选（降级用）"""
    suitable = []
    for r in RECIPES_DB:
        has_allergen = any(any(a.lower() in ing.lower() for ing in r["ingredients"]) for a in allergies)
        if has_allergen:
            continue
        if not conditions or any(c in r["suitable"] for c in conditions):
            suitable.append(r)
    if len(suitable) < 4:
        for r in RECIPES_DB:
            if r not in suitable and not any(
                any(a.lower() in ing.lower() for ing in r["ingredients"]) for a in allergies
            ):
                suitable.append(r)
            if len(suitable) >= 6:
                break
    random.shuffle(suitable)
    return suitable[:6]


@app.post("/api/recipes/recommend")
async def recipes_recommend(profile: HealthProfileReq):
    """健康食谱推荐：大模型按档案生成结构化 JSON，失败时降级本地食谱库"""
    conditions = profile.conditions or []
    allergies = profile.allergies

    if LLM_ENABLED:
        schema_hint = (
            '返回 JSON 对象：{"recipes":[{"name":string,"meal":"早餐|午餐|晚餐|加餐",'
            '"calories":number,"tags":string[],"ingredients":string[],"steps":string[],"suitable":string[]}]}，'
            "恰好 6 道菜，覆盖早餐、午餐、晚餐和加餐。只输出 JSON。"
        )
        prompt = (
            f"你是临床营养师。基础病：{'、'.join(conditions) or '无'}；过敏原：{'、'.join(allergies) or '无'}。"
            "请推荐一天的健康食谱，必须自动规避过敏原和禁忌食材（如糖尿病低 GI、高血压低盐），"
            "每道菜给出热量(kcal)、标签、食材、简要做法、适宜人群。"
            f"{schema_hint}"
        )
        try:
            data = await llm_client.generate_json(prompt)
            recipes = data.get("recipes", []) if isinstance(data, dict) else data
            if isinstance(recipes, list) and recipes and all("name" in r for r in recipes):
                return recipes[:6]
        except Exception:
            pass  # 降级

    return _local_recipes(conditions, allergies)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "康医助手 API"}


if __name__ == "__main__":
    import uvicorn
    import os

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
