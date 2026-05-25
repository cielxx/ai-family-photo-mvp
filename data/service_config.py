from typing import Optional


SERVICES = {
    "old_photo_restoration": {
        "service_type": "old_photo_restoration",
        "service_name": "老照片修复",
        "description": "修复模糊、划痕、褪色、噪点等老照片问题",
        "options": [
            "提高清晰度",
            "减少划痕",
            "修复褪色",
            "去除噪点",
            "保留年代感",
            "不要过度美化",
        ],
    },
    "colorization": {
        "service_type": "colorization",
        "service_name": "黑白照片上色",
        "description": "为黑白或灰度照片补充自然、柔和、符合年代氛围的色彩",
        "options": [
            "自然真实",
            "色彩柔和",
            "保留复古感",
            "肤色自然",
            "不要太鲜艳",
            "按年代氛围处理",
        ],
    },
    "portrait_generation": {
        "service_type": "portrait_generation",
        "service_name": "纪念照生成",
        "description": "基于用户上传的人像照片生成婚纱、复古、家庭纪念等风格照片",
        "options": [
            "中式婚纱",
            "复古影楼风",
            "温暖纪念感",
            "自然生活感",
            "不要过度美颜",
            "保留本人五官特征",
        ],
    },
}


def get_service(service_type: str) -> Optional[dict]:
    return SERVICES.get(service_type)
