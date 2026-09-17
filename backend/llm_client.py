"""
统一大模型客户端 —— 阿里云百炼·通义千问（OpenAI 兼容协议）

- 文本对话: qwen-plus（SSE 流式）
- 图片分析: qwen-vl-max（多模态，支持 base64 data URL）
- 健康建议 / 食谱: qwen-plus（结构化输出）

配置来源于 backend/.env，未配置 API Key 时 LLM_ENABLED=False，
调用方应显式降级到本地知识库，而不是伪装成大模型回复。
"""
import os
import json
import base64
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

logger = logging.getLogger("aima.llm")

API_KEY = os.getenv("DASHSCOPE_API_KEY", "").strip()
BASE_URL = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1").strip()
CHAT_MODEL = os.getenv("LLM_CHAT_MODEL", "qwen-plus").strip()
VISION_MODEL = os.getenv("LLM_VISION_MODEL", "qwen-vl-max").strip()

# 显式标记：只有形如真实 key（非占位符）时才启用
LLM_ENABLED = bool(API_KEY) and not API_KEY.startswith("sk-在这里")

client: Optional[AsyncOpenAI] = None
if LLM_ENABLED:
    client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=60.0)
    logger.info("LLM 已启用: chat=%s vision=%s", CHAT_MODEL, VISION_MODEL)
else:
    logger.warning("未配置 DASHSCOPE_API_KEY，系统运行在本地知识库降级模式")

# ---------------------------------------------------------------------------
# 系统提示词（医疗安全合规规则，依据 PRD F1/F2/F5 与第 4、7 节）
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """你是「康医助手」，一名严谨、温和的个人 AI 医疗健康助理。你的职责是院前轻问诊与日常健康管理。

【身份与边界】
1. 你不是医生，绝不能给出确定诊断或处方，结论使用"可能与……有关""建议排除……"等措辞。
2. 不提供具体药物剂量调整方案；涉及用药一律提示"请遵医嘱"。
3. 信息不足时，主动追问关键信息（部位、持续时间、严重程度、伴随症状、既往病史），不要臆测。

【输出结构（症状咨询时）】
- 🩺 可能的疾病方向：按可能性排序列出，注明"仅供参考"。
- ⚠️ 严重程度初判：可居家观察 / 建议就医 / 建议急诊。
- 🚨 危险信号（红旗症状）：列出需要立即就医的表现。
- 💡 健康建议：安全的居家护理与就医科室建议。
使用 Markdown 排版，语言简洁，适合普通人阅读。

【强制急诊规则】
若用户描述胸痛胸闷、呼吸困难、意识障碍、抽搐、偏瘫、剧烈头痛、呕血黑便、大量出血、严重过敏、
疑似中毒、孕妇异常出血/胎动异常、婴幼儿精神萎靡等高危信号，必须第一行明确提示：
"🚨 您描述的情况可能属于急症，请立即拨打 120 或前往急诊，不要继续在线咨询。"
不得继续展开自我处理方案延误就医。

【图片识别】
- 皮肤/体表图片：只描述可见特征与可能方向，提示何时需要面诊，不能看图确诊。
- 化验单/体检报告：解读异常指标的含义，必须提示"以医院正式报告为准"。
- 药品图片：可说明药品大类与说明书层面的注意事项，提示核对通用名、遵医嘱服用。
- 无法看清或无法判断时明确说明，绝不编造图片内容。

【免责声明】
每次回答末尾另起一行附简短声明：
> ⚠️ 以上内容仅供健康参考，不构成医疗诊断。如有不适请及时就医，急症请拨 120。

始终使用简体中文。"""


def _normalize_history(messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """把前端历史消息裁剪到合理长度并转为模型消息格式。"""
    # 最多携带最近 20 条，控制 token
    recent = messages[-20:]
    normalized: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in recent:
        role = m.get("role", "user")
        if role not in ("user", "assistant", "system"):
            role = "user"
        content = (m.get("content") or "").strip()
        if role == "system":
            continue
        if content:
            normalized.append({"role": role, "content": content})
    return normalized


async def stream_chat(
    messages: List[Dict[str, str]],
    images: Optional[List[str]] = None,
) -> AsyncGenerator[str, None]:
    """
    流式多轮对话。images 为 data URL 列表（data:image/...;base64,xxx）。
    有图片时走 qwen-vl-max 多模态模型，否则走 qwen-plus。
    逐 token yield 文本；异常时 yield 一段友好错误提示。
    """
    if not LLM_ENABLED or client is None:
        raise RuntimeError("LLM 未启用")

    payload_messages = _normalize_history(messages)

    # 构造多模态最后一条消息
    if images:
        last_user = None
        # 找到最后一条 user 消息
        for i in range(len(payload_messages) - 1, -1, -1):
            if payload_messages[i]["role"] == "user":
                last_user = i
                break

        content: List[Dict[str, Any]] = []
        text_value = ""
        if last_user is not None:
            text_value = payload_messages[last_user]["content"]
        image_hint = "请分析用户上传的图片（可能是皮肤症状、化验单/体检报告或药品包装），并结合文字问题回答。"
        content.append({"type": "text", "text": f"{text_value}\n\n{image_hint}".strip()})
        for url in images:
            content.append({"type": "image_url", "image_url": {"url": url}})

        if last_user is not None:
            payload_messages[last_user] = {"role": "user", "content": content}
        else:
            payload_messages.append({"role": "user", "content": content})

        model = VISION_MODEL
    else:
        model = CHAT_MODEL

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=payload_messages,
            stream=True,
            temperature=0.6,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            token = getattr(delta, "content", None)
            if token:
                yield token
    except Exception as e:  # noqa: BLE001 - 需把错误透传给用户
        logger.exception("流式对话失败")
        yield f"\n\n⚠️ 大模型服务暂时不可用（{type(e).__name__}），请稍后重试或检查 API Key 配置。"


async def generate_text(prompt: str, system: Optional[str] = None) -> str:
    """非结构化文本生成（用于健康建议）。失败抛异常由调用方降级。"""
    if not LLM_ENABLED or client is None:
        raise RuntimeError("LLM 未启用")

    messages = [{"role": "system", "content": system or SYSTEM_PROMPT}, {"role": "user", "content": prompt}]
    resp = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.5,
    )
    return resp.choices[0].message.content or ""


async def generate_json(prompt: str, system: Optional[str] = None) -> Any:
    """要求模型输出 JSON 并解析。解析失败抛 ValueError。"""
    if not LLM_ENABLED or client is None:
        raise RuntimeError("LLM 未启用")

    messages = [
        {"role": "system", "content": system or "你是一个只输出 JSON 的助手，不要输出任何解释或 Markdown 代码块标记。"},
        {"role": "user", "content": prompt},
    ]
    resp = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.7,
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or ""
    return json.loads(raw)


async def analyze_image_bytes(file_bytes: bytes, mime: str = "image/jpeg") -> str:
    """多模态图片分析（multipart 上传路径）。"""
    if not LLM_ENABLED or client is None:
        raise RuntimeError("LLM 未启用")

    b64 = base64.b64encode(file_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "请分析这张图片（皮肤症状 / 化验单 / 药品包装等），给出可见特征、可能方向与就医建议。",
                },
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        },
    ]
    resp = await client.chat.completions.create(
        model=VISION_MODEL,
        messages=messages,
        temperature=0.4,
    )
    return resp.choices[0].message.content or ""
