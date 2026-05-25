from __future__ import annotations

import html
from io import BytesIO
from pathlib import Path
from typing import Any

import streamlit as st
from PIL import Image, ImageOps

from data.service_config import SERVICES, get_service
from services.dify_client import (
    call_dify_adjustment_workflow,
    call_dify_workflow,
    is_adjustment_dify_configured,
    is_dify_configured,
    parse_dify_adjustment_response,
    parse_dify_response,
)


HOME_PREVIEW_DIR = Path(__file__).parent / "assets" / "home_preview"

STATE_DEFAULTS = {
    "current_step": "home",
    "error_message": "",
    "is_loading": False,
    "debug_mode": False,
    "service_type": "",
    "service_name": "",
    "uploaded_image": None,
    "image_name": "",
    "source_uploader_had_file": False,
    "source_uploader_key_version": 0,
    "selected_options": [],
    "custom_requirement": "",
    "authorization_confirmed": False,
    "task_card": "",
    "generated_prompt": "",
    "dify_raw_response": {},
    "workflow_run_id": "",
    "result_image": None,
    "result_image_name": "",
    "use_sample_result": False,
    "result_uploader_had_file": False,
    "result_uploader_key_version": 0,
    "is_regenerating_variant": False,
    "show_adjustment_panel": False,
    "issue_tags": [],
    "adjustment_requirement": "",
    "adjustment_task_card": "",
    "second_round_prompt": "",
    "adjustment_raw_response": {},
    "adjustment_workflow_run_id": "",
    "is_adjustment_loading": False,
    "adjustment_error_message": "",
    "adjusted_result_image": None,
    "adjusted_result_image_name": "",
    "adjusted_result_uploader_had_file": False,
    "adjusted_result_uploader_key_version": 0,
    "show_adjusted_result": False,
}


def init_session_state() -> None:
    for key, value in STATE_DEFAULTS.items():
        if key not in st.session_state:
            st.session_state[key] = (
                value.copy() if isinstance(value, (dict, list)) else value
            )


def go_to(step: str) -> None:
    st.session_state.current_step = step
    st.session_state.error_message = ""


def get_uploader_key(base_key: str) -> str:
    return f"{base_key}_{st.session_state.get(f'{base_key}_key_version', 0)}"


def reset_uploader_key(base_key: str) -> None:
    st.session_state[f"{base_key}_key_version"] = (
        st.session_state.get(f"{base_key}_key_version", 0) + 1
    )


def reset_for_new_service() -> None:
    for widget_key in (
        "source_uploader",
        "requirements_options",
        "custom_requirement_input",
        "authorization_checkbox",
        "result_uploader",
        "issue_tags_input",
        "adjustment_requirement_input",
    ):
        st.session_state.pop(widget_key, None)
    clear_upload_requirement_state()
    st.session_state.uploaded_image = None
    st.session_state.image_name = ""
    st.session_state.task_card = ""
    st.session_state.generated_prompt = ""
    st.session_state.dify_raw_response = {}
    st.session_state.workflow_run_id = ""
    st.session_state.result_image = None
    st.session_state.result_image_name = ""
    st.session_state.use_sample_result = False
    clear_adjustment_state()


def clear_upload_requirement_state() -> None:
    reset_uploader_key("source_uploader")
    for widget_key in (
        "source_uploader",
        "requirements_options",
        "custom_requirement_input",
        "authorization_checkbox",
    ):
        st.session_state.pop(widget_key, None)
    st.session_state.uploaded_image = None
    st.session_state.image_name = ""
    st.session_state.source_uploader_had_file = False
    st.session_state.selected_options = []
    st.session_state.custom_requirement = ""
    st.session_state.authorization_confirmed = False


def clear_adjustment_state() -> None:
    for widget_key in (
        "issue_tags_input",
        "adjustment_requirement_input",
        "adjusted_result_uploader",
    ):
        st.session_state.pop(widget_key, None)
    st.session_state.show_adjustment_panel = False
    st.session_state.issue_tags = []
    st.session_state.adjustment_requirement = ""
    st.session_state.adjustment_task_card = ""
    st.session_state.second_round_prompt = ""
    st.session_state.adjustment_raw_response = {}
    st.session_state.adjustment_workflow_run_id = ""
    st.session_state.is_adjustment_loading = False
    st.session_state.adjustment_error_message = ""
    clear_adjusted_result_state()


def clear_adjusted_result_state() -> None:
    reset_uploader_key("adjusted_result_uploader")
    st.session_state.pop("adjusted_result_uploader", None)
    st.session_state.adjusted_result_image = None
    st.session_state.adjusted_result_image_name = ""
    st.session_state.adjusted_result_uploader_had_file = False
    st.session_state.show_adjusted_result = False


def clear_result_image_state() -> None:
    reset_uploader_key("result_uploader")
    st.session_state.result_image = None
    st.session_state.result_image_name = ""
    st.session_state.use_sample_result = False
    st.session_state.result_uploader_had_file = False


def restart_task() -> None:
    reset_uploader_key("source_uploader")
    for widget_key in (
        "source_uploader",
        "requirements_options",
        "custom_requirement_input",
        "authorization_checkbox",
        "result_uploader",
        "issue_tags_input",
        "adjustment_requirement_input",
    ):
        st.session_state.pop(widget_key, None)
    st.session_state.service_type = ""
    st.session_state.service_name = ""
    st.session_state.uploaded_image = None
    st.session_state.image_name = ""
    st.session_state.source_uploader_had_file = False
    st.session_state.selected_options = []
    st.session_state.custom_requirement = ""
    st.session_state.authorization_confirmed = False
    st.session_state.task_card = ""
    st.session_state.generated_prompt = ""
    st.session_state.dify_raw_response = {}
    st.session_state.workflow_run_id = ""
    clear_result_image_state()
    st.session_state.is_regenerating_variant = False
    clear_adjustment_state()
    go_to("home")


def render_home() -> None:
    render_page_intro("AI 家庭纪念影像助手", "让旧照片重新清晰，让家庭记忆有新的呈现")
    st.markdown('<div class="section-gap"></div>', unsafe_allow_html=True)
    st.markdown("### 效果预览")

    preview_groups = [
        ("老照片修复", ("old_before", "修复前"), ("old_after", "修复后")),
        ("黑白照片上色", ("color_before", "上色前"), ("color_after", "上色后")),
        ("纪念照生成", ("memorial_before", "原照片"), ("memorial_after", "示意图")),
    ]
    columns = st.columns(3)
    for column, (title, before_item, after_item) in zip(columns, preview_groups):
        with column:
            with st.container(border=True):
                st.markdown(f"#### {title}")
                before_column, after_column = st.columns(2)
                with before_column:
                    render_home_preview_image(*before_item)
                with after_column:
                    render_home_preview_image(*after_item)

    st.markdown('<div class="section-gap"></div>', unsafe_allow_html=True)
    if st.button("开始制作", type="primary", width="stretch"):
        go_to("service_select")
        st.rerun()

    st.divider()
    st.markdown(
        '<p class="home-auth-note">照片仅用于本次处理，请确保已获得照片中人物授权</p>',
        unsafe_allow_html=True,
    )


def render_page_intro(title: str, subtitle: str | None = None) -> None:
    st.title(title)
    if subtitle:
        st.markdown(
            f'<p class="page-subtitle">{html.escape(subtitle)}</p>',
            unsafe_allow_html=True,
        )
    st.markdown('<div class="memory-divider">⌁  ·  ✦  ·  ⌁</div>', unsafe_allow_html=True)


def inject_global_styles() -> None:
    st.markdown(
        """
        <style>
        .block-container {
            max-width: 1000px;
            padding-top: 1.45rem;
            padding-bottom: 3.2rem;
        }
        h1 {
            color: #1F4A4A;
            margin-bottom: 0.35rem;
            letter-spacing: 0;
            text-align: center;
            font-size: 2.12rem;
            line-height: 1.18;
        }
        h2, h3, h4 {
            color: #1F4A4A;
            letter-spacing: 0;
        }
        h3 {
            margin-top: 1rem;
        }
        p, span, label {
            letter-spacing: 0;
        }
        div[data-testid="stVerticalBlockBorderWrapper"] {
            background: #FFFDF8;
            border: 1px solid #E8DED2;
            border-radius: 16px;
            box-shadow: 0 12px 32px rgba(31, 74, 74, 0.08);
            padding: 0.05rem;
        }
        div[data-testid="stVerticalBlock"] > div:has(> div[data-testid="stFileUploader"]) {
            margin-top: 0.6rem;
            margin-bottom: 1rem;
        }
        div[data-testid="stImage"] {
            margin-top: 0.5rem;
            margin-bottom: 0.8rem;
            text-align: center;
        }
        div[data-testid="stImage"] img {
            border-radius: 12px;
            display: block;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
            max-height: 560px;
            object-fit: contain;
        }
        div[data-testid="stButton"] {
            margin-top: 0.25rem;
        }
        div[data-testid="stButton"] button,
        div[data-testid="stDownloadButton"] button {
            border-radius: 999px;
            min-height: 2.25rem;
            border-color: #D8CBBB;
            box-shadow: none;
        }
        div[data-testid="stButton"] button[kind="primary"],
        div[data-testid="stDownloadButton"] button[kind="primary"] {
            background: #5B9A96;
            border-color: #5B9A96;
            color: white;
        }
        div[data-testid="stButton"] button[kind="primary"]:hover,
        div[data-testid="stDownloadButton"] button[kind="primary"]:hover {
            background: #4F8F8A;
            border-color: #4F8F8A;
        }
        div[data-testid="stAlert"] {
            border-radius: 8px;
            border-color: #E8DED2;
        }
        div[data-testid="stFileUploader"] {
            margin-top: 0.3rem;
        }
        div[data-testid="stFileUploader"] section {
            background: #FFFDF8;
            border-color: #DCCBB7;
            border-radius: 14px;
        }
        div[data-testid="column"] > div {
            gap: 0.65rem;
        }
        button[data-baseweb="tag"],
        div[data-baseweb="tag"],
        [data-baseweb="button-group"] button {
            border-radius: 999px;
        }
        button[data-baseweb="tag"][aria-selected="true"],
        div[data-baseweb="tag"][aria-selected="true"],
        [data-baseweb="button-group"] button[aria-selected="true"],
        [data-baseweb="button-group"] button[aria-pressed="true"] {
            border-color: #5B9A96 !important;
            background-color: #E8F3F1 !important;
            color: #1F4A4A !important;
        }
        .section-gap {
            height: 0.45rem;
        }
        .page-subtitle,
        .home-auth-note {
            color: #6B7280;
            text-align: center;
            margin: 0.1rem auto 0.35rem;
        }
        .home-auth-note {
            font-size: 0.92rem;
        }
        .memory-divider {
            color: #D8B98E;
            text-align: center;
            margin: 0.35rem 0 1.1rem;
        }
        .home-preview-image {
            width: 100%;
            aspect-ratio: 4 / 3;
            object-fit: cover;
            border-radius: 12px;
            border: 1px solid #E8DED2;
            display: block;
        }
        .home-preview-label {
            color: #6B7280;
            font-size: 0.86rem;
            margin-top: 0.35rem;
            text-align: center;
        }
        .preview-fallback {
            height: 120px;
            border-radius: 12px;
            border: 1px solid #E8DED2;
            background: #F5F1EA;
            color: #6B7280;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
        }
        .upload-preview-frame {
            max-width: 680px;
            max-height: 520px;
            margin: 0.5rem auto 0.85rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            background: #FFFDF8;
            border: 1px solid #E8DED2;
            padding: 0.75rem;
            overflow: hidden;
        }
        .upload-preview-frame img {
            max-width: 100%;
            max-height: 496px;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 12px;
            display: block;
        }
        .service-card-main {
            display: flex;
            align-items: center;
            gap: 22px;
        }
        .service-card-icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #F5F1EA;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.45rem;
            flex: 0 0 44px;
        }
        .service-card-title {
            color: #1F4A4A;
            font-size: 1.22rem;
            font-weight: 650;
            margin-bottom: 0.15rem;
        }
        .service-card-desc {
            color: #6B7280;
            font-size: 0.92rem;
        }
        .upload-preview-caption {
            color: #6B7280;
            font-size: 0.88rem;
            text-align: center;
            margin: -0.25rem auto 0.8rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_home_preview_image(stem: str, label: str) -> None:
    image_path = resolve_home_preview_path(stem)
    if not image_path:
        render_preview_placeholder(label)
        return

    safe_label = html.escape(label)
    thumbnail = load_home_preview_thumbnail(
        str(image_path),
        image_path.stat().st_mtime_ns,
    )
    st.image(thumbnail, width="stretch")
    st.markdown(
        f'<div class="home-preview-label">{safe_label}</div>',
        unsafe_allow_html=True,
    )


def resolve_home_preview_path(stem: str) -> Path | None:
    for suffix in (".png", ".jpg", ".jpeg"):
        path = HOME_PREVIEW_DIR / f"{stem}{suffix}"
        if path.exists():
            return path
    return None


@st.cache_data(show_spinner=False)
def load_home_preview_thumbnail(path: str, modified_at: int) -> bytes:
    del modified_at
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        thumbnail = ImageOps.fit(
            image,
            (480, 360),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        output = BytesIO()
        thumbnail.save(output, format="JPEG", quality=86, optimize=True)
        return output.getvalue()


def render_constrained_image(
    image_bytes: bytes,
    caption: str,
    file_name: str = "",
) -> None:
    del file_name
    st.image(image_bytes, caption=caption, width=700)


def render_preview_placeholder(label: str) -> None:
    safe_label = html.escape(label)
    st.markdown(
        f"""
        <div class="preview-fallback">{safe_label}</div>
        <div class="home-preview-label">{safe_label}</div>
        """,
        unsafe_allow_html=True,
    )


def render_service_select() -> None:
    render_page_intro("请选择你想制作的类型", "选择合适的服务，让珍贵照片焕然一新")

    service_icons = {
        "old_photo_restoration": "🖼️",
        "colorization": "🎨",
        "portrait_generation": "📷",
    }
    for service in SERVICES.values():
        with st.container(border=True):
            content_column, action_column = st.columns([5, 0.9])
            with content_column:
                st.markdown(
                    f"""
                    <div class="service-card-main">
                        <div class="service-card-icon">{service_icons.get(service['service_type'], '✦')}</div>
                        <div>
                            <div class="service-card-title">{service['service_name']}</div>
                            <div class="service-card-desc">{service['description']}</div>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            with action_column:
                if st.button(
                    "选择",
                    key=f"select_{service['service_type']}",
                    width="stretch",
                ):
                    reset_for_new_service()
                    st.session_state.service_type = service["service_type"]
                    st.session_state.service_name = service["service_name"]
                    go_to("upload_requirements")
                    st.rerun()

    if st.button("返回首页"):
        go_to("home")
        st.rerun()


def render_upload_requirements() -> None:
    service = get_service(st.session_state.service_type)
    if not service:
        st.warning("请先选择一个服务。")
        if st.button("去选择服务"):
            go_to("service_select")
            st.rerun()
        return

    render_page_intro(f"当前选择：{service['service_name']}")
    st.info(f"当前服务：{service['service_name']}")

    with st.container(border=True):
        uploaded_file = st.file_uploader(
            "上传需要处理的照片",
            type=["jpg", "jpeg", "png"],
            key=get_uploader_key("source_uploader"),
        )
        if uploaded_file is not None:
            st.session_state.uploaded_image = uploaded_file.getvalue()
            st.session_state.image_name = uploaded_file.name
            st.session_state.source_uploader_had_file = True
        elif st.session_state.source_uploader_had_file and uploaded_file is None:
            clear_upload_requirement_state()
            st.rerun()

        has_uploaded_image = bool(st.session_state.uploaded_image)
        if not has_uploaded_image:
            st.caption("点击上传或从本地选择，支持 jpg / jpeg / png 格式")
            st.info(get_service_upload_tip(service["service_type"]))
        else:
            st.subheader("已上传照片")
            render_constrained_image(
                st.session_state.uploaded_image,
                st.session_state.image_name or "已上传照片",
                st.session_state.image_name,
            )
            if st.button("清除并重新上传"):
                clear_upload_requirement_state()
                st.rerun()
            selected_options = st.pills(
                "选择你最关注的处理重点",
                service["options"],
                default=st.session_state.selected_options,
                selection_mode="multi",
                key="requirements_options",
            )
            st.session_state.selected_options = selected_options or []
            st.session_state.custom_requirement = st.text_area(
                "补充说明",
                value=st.session_state.custom_requirement,
                placeholder="例如：希望保留老人自然皱纹，背景不要改动太多。",
                key="custom_requirement_input",
            ).strip()
            st.session_state.authorization_confirmed = st.checkbox(
                "我确认已获得照片中人物的授权，并同意该照片仅用于本次影像处理与结果展示。",
                value=st.session_state.authorization_confirmed,
                key="authorization_checkbox",
            )

    left, right = st.columns(2)
    with left:
        if st.button("返回选择服务", width="stretch"):
            clear_upload_requirement_state()
            go_to("service_select")
            st.rerun()
    with right:
        if has_uploaded_image:
            if st.button("开始处理", type="primary", width="stretch"):
                validation_message = validate_requirements()
                if validation_message:
                    st.warning(validation_message)
                else:
                    go_to("generating_task")
                    st.rerun()


def get_service_upload_tip(service_type: str) -> str:
    tips = {
        "old_photo_restoration": "适合模糊、划痕、褪色、噪点明显的老照片。",
        "colorization": "适合黑白、灰度或色彩信息较少的旧照片。",
        "portrait_generation": "适合人物主体清晰、五官可辨识的人像照片。",
    }
    return tips.get(service_type, "适合需要进行家庭纪念影像处理的照片。")


def validate_requirements() -> str:
    if not st.session_state.uploaded_image:
        return "请先上传一张需要处理的照片。"
    if not st.session_state.authorization_confirmed:
        return "请先确认已获得照片中人物授权。"
    return ""


def render_generating_task() -> None:
    st.title("正在生成 AI 处理方案")
    st.write("系统正在根据你的照片信息和需求生成处理任务，请稍候……")

    if st.session_state.task_card or st.session_state.generated_prompt:
        go_to("operation_prepare")
        st.rerun()

    st.session_state.is_loading = True
    with st.spinner("AI Workflow 处理中"):
        try:
            parsed_response = request_workflow_plan()
        except Exception as exc:
            st.session_state.is_loading = False
            go_to("upload_requirements")
            st.session_state.error_message = f"生成处理方案失败：{exc}"
            st.rerun()

    store_workflow_response(parsed_response)
    st.session_state.is_loading = False
    go_to("operation_prepare")
    st.rerun()


def request_workflow_plan() -> dict:
    inputs = {
        "service_type": st.session_state.service_type,
        "image_name": st.session_state.image_name,
        "selected_options": "，".join(st.session_state.selected_options),
        "custom_requirement": st.session_state.custom_requirement,
        "authorization_confirmed": str(
            st.session_state.authorization_confirmed
        ).lower(),
    }
    if not is_dify_configured():
        return parse_dify_response(mock_dify_response())
    return parse_dify_response(call_dify_workflow(inputs))


def request_adjustment_workflow_plan() -> dict:
    inputs = {
        "parent_task_card": st.session_state.task_card,
        "original_prompt": st.session_state.generated_prompt,
        "issue_tags": "，".join(st.session_state.issue_tags),
        "adjustment_requirement": st.session_state.adjustment_requirement,
    }
    if not is_adjustment_dify_configured():
        return parse_dify_adjustment_response(mock_dify_adjustment_response())
    return parse_dify_adjustment_response(call_dify_adjustment_workflow(inputs))


def mock_dify_response() -> dict:
    return {
        "workflow_run_id": "mock-workflow-run",
        "outputs": {
            "task_card": "【Mock】这里是 Dify 返回的任务卡。请配置 DIFY_API_KEY 和 DIFY_WORKFLOW_URL 后调用真实 workflow。",
            "generated_prompt": "【Mock】这里是 Dify 返回的图像处理 Prompt。真实版本会根据用户选择生成。",
        },
        "mock": True,
    }


def mock_dify_adjustment_response() -> dict:
    return {
        "workflow_run_id": "mock-adjustment-workflow-run",
        "outputs": {
            "adjustment_task_card": "【Mock】这里是 Dify 二次调整 Workflow 返回的调整任务卡。配置二次调整 Workflow 后将调用真实服务。",
            "second_round_prompt": "【Mock】这里是二次调整后的图像处理 Prompt。真实版本会根据问题标签和补充说明生成。",
        },
        "mock": True,
    }


def store_workflow_response(parsed_response: dict) -> None:
    st.session_state.task_card = parsed_response.get("task_card", "")
    st.session_state.generated_prompt = parsed_response.get("generated_prompt", "")
    st.session_state.workflow_run_id = parsed_response.get("workflow_run_id", "")
    st.session_state.dify_raw_response = parsed_response.get("raw_response", {})


def store_adjustment_workflow_response(parsed_response: dict) -> None:
    st.session_state.adjustment_task_card = parsed_response.get(
        "adjustment_task_card", ""
    )
    st.session_state.second_round_prompt = parsed_response.get(
        "second_round_prompt", ""
    )
    st.session_state.adjustment_workflow_run_id = parsed_response.get(
        "workflow_run_id", ""
    )
    st.session_state.adjustment_raw_response = parsed_response.get("raw_response", {})


def render_operation_prepare() -> None:
    render_page_intro("AI 已理解你的需求")
    with st.container(border=True):
        if st.session_state.dify_raw_response.get("mock"):
            st.caption("当前为演示模式，系统已生成处理方案，处理结果需手动上传后查看。")
        st.write(f"本次服务：{st.session_state.service_name}")
        st.write("重点处理：")
        render_option_chips(
            st.session_state.selected_options,
            empty_message="未选择具体标签，将按所选服务的默认处理目标生成方案。",
        )
        st.write(
            f"补充说明：{st.session_state.custom_requirement or '未填写'}"
        )
        if st.session_state.is_regenerating_variant:
            st.info("当前为演示模式，请上传另一版生成结果以继续预览。")
        else:
            st.info("当前为演示模式，请上传处理完成后的效果图以继续预览。")

        result_file = st.file_uploader(
            "上传处理完成后的效果图",
            type=["jpg", "jpeg", "png"],
            key=get_uploader_key("result_uploader"),
        )
        if result_file is not None:
            st.session_state.result_image = result_file.getvalue()
            st.session_state.result_image_name = result_file.name
            st.session_state.use_sample_result = False
            st.session_state.result_uploader_had_file = True
        elif st.session_state.result_uploader_had_file and result_file is None:
            clear_result_image_state()

        if st.session_state.result_image:
            render_constrained_image(
                st.session_state.result_image,
                st.session_state.result_image_name or "处理结果预览",
                st.session_state.result_image_name,
            )
            if st.button("清除已上传效果图"):
                st.session_state.pop("result_uploader", None)
                clear_result_image_state()
                st.rerun()

    if st.button("查看处理结果", type="primary", width="stretch"):
        if not st.session_state.result_image:
            st.warning("请先上传处理完成后的效果图。")
        else:
            go_to("result")
            st.rerun()

    with st.expander("查看 AI Workflow 详情"):
        if st.session_state.dify_raw_response.get("mock"):
            st.caption("Dify Workflow 尚未配置，当前使用 Mock 结果预览页面流程。")
        render_workflow_detail(include_raw=True)


def render_result() -> None:
    if not st.session_state.result_image:
        st.warning("还没有可展示的结果图。")
        if st.button("返回上传结果图"):
            go_to("operation_prepare")
            st.rerun()
        return

    if st.session_state.show_adjusted_result and st.session_state.adjusted_result_image:
        render_adjusted_result()
        return

    render_page_intro("处理完成")
    with st.container(border=True):
        original_column, result_column = st.columns(2)
        with original_column:
            st.subheader("原图")
            st.image(st.session_state.uploaded_image, width="stretch")
        with result_column:
            st.subheader("效果图")
            st.image(st.session_state.result_image, width="stretch")

    st.write(f"本次服务：{st.session_state.service_name}")
    st.write("重点处理：")
    render_option_chips(
        st.session_state.selected_options,
        empty_message="未选择具体标签，将按所选服务的默认处理目标生成方案。",
    )

    st.download_button(
        "保存照片",
        data=st.session_state.result_image,
        file_name=st.session_state.result_image_name or "ai-memory-photo-result.png",
        mime=get_image_mime(st.session_state.result_image_name),
        type="primary",
        width="stretch",
    )

    regenerate_column, adjust_column = st.columns(2)
    with regenerate_column:
        if st.button("再生成一版", width="stretch"):
            st.session_state.pop("result_uploader", None)
            clear_result_image_state()
            clear_adjustment_state()
            st.session_state.is_regenerating_variant = True
            go_to("operation_prepare")
            st.rerun()
    with adjust_column:
        if st.button("我想调整", width="stretch"):
            st.session_state.show_adjustment_panel = True
            st.rerun()

    if st.button("重新开始", width="stretch"):
        restart_task()
        st.rerun()

    if st.session_state.show_adjustment_panel:
        render_adjustment_panel()

    with st.expander("查看本次 AI Workflow 详情"):
        render_workflow_detail(include_raw=False)


def render_adjusted_result() -> None:
    render_page_intro("调整完成")
    with st.container(border=True):
        before_column, after_column = st.columns(2)
        with before_column:
            st.subheader("调整前效果图")
            st.image(st.session_state.result_image, width="stretch")
        with after_column:
            st.subheader("调整后效果图")
            st.image(st.session_state.adjusted_result_image, width="stretch")

    st.download_button(
        "保存照片",
        data=st.session_state.adjusted_result_image,
        file_name=(
            st.session_state.adjusted_result_image_name
            or "ai-memory-photo-adjusted-result.png"
        ),
        mime=get_image_mime(st.session_state.adjusted_result_image_name),
        type="primary",
        width="stretch",
    )
    if st.button("重新开始", width="stretch"):
        restart_task()
        st.rerun()

    with st.expander("查看二次调整 AI Workflow 详情"):
        render_adjustment_workflow_detail()
    with st.expander("查看本次 AI Workflow 详情"):
        render_workflow_detail(include_raw=True)


def render_adjustment_panel() -> None:
    st.divider()
    has_adjustment_plan = bool(
        st.session_state.adjustment_task_card or st.session_state.second_round_prompt
    )
    if has_adjustment_plan:
        render_adjustment_plan_ready()
        return

    st.subheader("调整需求")
    issue_options = [
        "不像本人",
        "过度美化",
        "颜色不对",
        "细节变形",
        "画面瑕疵",
        "修复不明显",
        "失去年代感",
        "背景变化太大",
    ]
    selected_issue_tags = st.pills(
        "问题标签",
        issue_options,
        default=st.session_state.issue_tags,
        selection_mode="multi",
        key="issue_tags_input",
    )
    st.session_state.issue_tags = selected_issue_tags or []
    st.session_state.adjustment_requirement = st.text_area(
        "补充调整说明",
        value=st.session_state.adjustment_requirement,
        placeholder="例如：脸部不要太磨皮，背景颜色希望更自然。",
        key="adjustment_requirement_input",
    ).strip()

    if st.session_state.adjustment_error_message:
        st.warning(st.session_state.adjustment_error_message)

    cancel_column, confirm_column = st.columns(2)
    with cancel_column:
        if st.button("关闭 / 取消", width="stretch"):
            st.session_state.show_adjustment_panel = False
            st.rerun()
    with confirm_column:
        if st.button("确认调整", type="primary", width="stretch"):
            validation_message = validate_adjustment_requirements()
            if validation_message:
                st.warning(validation_message)
            else:
                st.session_state.is_adjustment_loading = True
                st.session_state.adjustment_error_message = ""
                with st.spinner("正在生成二次调整方案"):
                    try:
                        parsed_response = request_adjustment_workflow_plan()
                    except Exception:
                        st.session_state.adjustment_error_message = (
                            "生成二次调整方案失败，请稍后重试。"
                        )
                    else:
                        store_adjustment_workflow_response(parsed_response)
                st.session_state.is_adjustment_loading = False
                st.rerun()


def render_adjustment_plan_ready() -> None:
    st.subheader("二次调整方案已生成")
    st.success("系统已根据你的反馈生成二次调整方案。")
    st.write(f"本次调整重点：{format_adjustment_summary()}")

    st.markdown("#### 上传二次调整后的效果图")
    st.info("当前为演示模式，请上传根据二次调整方案完成后的效果图，用于查看调整结果。")
    render_adjusted_result_upload()

    with st.expander("查看二次调整 AI Workflow 详情"):
        if st.session_state.adjustment_raw_response.get("mock"):
            st.caption("Dify 二次调整 Workflow 尚未配置，当前使用 Mock 结果预览页面流程。")
        render_adjustment_workflow_detail()


def render_adjusted_result_upload() -> None:
    adjusted_file = st.file_uploader(
        "上传二次调整后的效果图",
        type=["jpg", "jpeg", "png"],
        key=get_uploader_key("adjusted_result_uploader"),
    )
    if adjusted_file is not None:
        st.session_state.adjusted_result_image = adjusted_file.getvalue()
        st.session_state.adjusted_result_image_name = adjusted_file.name
        st.session_state.adjusted_result_uploader_had_file = True
        st.session_state.show_adjusted_result = False
    elif (
        st.session_state.adjusted_result_uploader_had_file
        and adjusted_file is None
    ):
        clear_adjusted_result_state()

    if st.session_state.adjusted_result_image:
        render_constrained_image(
            st.session_state.adjusted_result_image,
            st.session_state.adjusted_result_image_name or "二次调整效果图",
            st.session_state.adjusted_result_image_name,
        )
        if st.button("清除二次调整效果图"):
            clear_adjusted_result_state()
            st.rerun()

    if st.button("查看调整结果", type="primary", width="stretch"):
        if not st.session_state.adjusted_result_image:
            st.warning("请先上传二次调整后的效果图。")
        else:
            st.session_state.show_adjusted_result = True
            st.rerun()


def validate_adjustment_requirements() -> str:
    if not st.session_state.issue_tags and not st.session_state.adjustment_requirement:
        return "请至少选择一个问题标签，或填写具体调整说明。"
    return ""


def format_adjustment_summary() -> str:
    if st.session_state.issue_tags:
        return "，".join(st.session_state.issue_tags)
    return st.session_state.adjustment_requirement or "根据补充说明调整"


def render_option_chips(options: list[str], empty_message: str = "未选择标签") -> None:
    if not options:
        st.caption(empty_message)
        return
    st.write("　".join(f"`{option}`" for option in options))


def render_workflow_detail(include_raw: bool) -> None:
    render_detail_value("task_card", st.session_state.task_card)
    render_detail_value("generated_prompt", st.session_state.generated_prompt)
    if include_raw:
        st.markdown("**dify_raw_response**")
        st.json(st.session_state.dify_raw_response or {})


def render_adjustment_workflow_detail() -> None:
    render_detail_value(
        "adjustment_task_card", st.session_state.adjustment_task_card
    )
    render_detail_value("second_round_prompt", st.session_state.second_round_prompt)
    st.markdown("**adjustment_raw_response**")
    st.json(st.session_state.adjustment_raw_response or {})


def render_detail_value(label: str, value: Any) -> None:
    st.markdown(f"**{label}**")
    st.code(value or "", language="text")


def get_image_mime(file_name: str) -> str:
    lowered_name = file_name.lower()
    if lowered_name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    return "image/png"


def render_app() -> None:
    st.set_page_config(
        page_title="AI 家庭纪念影像助手",
        page_icon="📷",
        layout="centered",
    )
    inject_global_styles()
    init_session_state()

    if st.session_state.error_message:
        st.error(st.session_state.error_message)

    pages = {
        "home": render_home,
        "service_select": render_service_select,
        "upload_requirements": render_upload_requirements,
        "generating_task": render_generating_task,
        "operation_prepare": render_operation_prepare,
        "result": render_result,
    }
    pages.get(st.session_state.current_step, render_home)()


if __name__ == "__main__":
    render_app()
