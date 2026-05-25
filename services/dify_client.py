from typing import Any

import requests
import streamlit as st


def _get_secret(name: str) -> str:
    try:
        value = st.secrets.get(name, "")
    except Exception:
        return ""
    return str(value).strip() if value else ""


def is_dify_configured() -> bool:
    return bool(_get_secret("DIFY_API_KEY") and _get_secret("DIFY_WORKFLOW_URL"))


def is_adjustment_dify_configured() -> bool:
    return bool(
        _get_secret("DIFY_ADJUSTMENT_API_KEY")
        and _get_secret("DIFY_ADJUSTMENT_WORKFLOW_URL")
    )


def call_dify_workflow(inputs: dict) -> dict:
    api_key = _get_secret("DIFY_API_KEY")
    workflow_url = _get_secret("DIFY_WORKFLOW_URL")
    if not api_key or not workflow_url:
        raise RuntimeError("Dify Workflow 尚未配置。")

    payload = {
        "inputs": inputs,
        "response_mode": "blocking",
        "user": "streamlit-demo-user",
    }
    response = requests.post(
        workflow_url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def call_dify_adjustment_workflow(inputs: dict) -> dict:
    api_key = _get_secret("DIFY_ADJUSTMENT_API_KEY")
    workflow_url = _get_secret("DIFY_ADJUSTMENT_WORKFLOW_URL")
    if not api_key or not workflow_url:
        raise RuntimeError("Dify 二次调整 Workflow 尚未配置。")

    payload = {
        "inputs": inputs,
        "response_mode": "blocking",
        "user": "streamlit-demo-user",
    }
    response = requests.post(
        workflow_url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def parse_dify_response(response_json: dict) -> dict:
    task_card = _first_value(
        response_json,
        ("data", "outputs", "task_card"),
        ("outputs", "task_card"),
        ("task_card",),
    )
    generated_prompt = _first_value(
        response_json,
        ("data", "outputs", "generated_prompt"),
        ("outputs", "generated_prompt"),
        ("generated_prompt",),
    )
    workflow_run_id = _first_value(
        response_json,
        ("workflow_run_id",),
        ("data", "workflow_run_id"),
    )

    return {
        "task_card": _as_text(task_card),
        "generated_prompt": _as_text(generated_prompt),
        "workflow_run_id": _as_text(workflow_run_id),
        "raw_response": response_json,
    }


def parse_dify_adjustment_response(response_json: dict) -> dict:
    adjustment_task_card = _first_value(
        response_json,
        ("data", "outputs", "adjustment_task_card"),
        ("outputs", "adjustment_task_card"),
        ("adjustment_task_card",),
    )
    second_round_prompt = _first_value(
        response_json,
        ("data", "outputs", "second_round_prompt"),
        ("outputs", "second_round_prompt"),
        ("second_round_prompt",),
    )
    workflow_run_id = _first_value(
        response_json,
        ("workflow_run_id",),
        ("data", "workflow_run_id"),
    )

    return {
        "adjustment_task_card": _as_text(adjustment_task_card),
        "second_round_prompt": _as_text(second_round_prompt),
        "workflow_run_id": _as_text(workflow_run_id),
        "raw_response": response_json,
    }


def _first_value(payload: dict, *paths: tuple[str, ...]) -> Any:
    for path in paths:
        value: Any = payload
        for key in path:
            if not isinstance(value, dict) or key not in value:
                value = None
                break
            value = value[key]
        if value is not None:
            return value
    return ""


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)
