from fastapi import HTTPException

MESSAGES = {
    "UNSUPPORTED_FORMAT": (400, "지원하지 않는 파일 형식입니다. PNG, JPG, JPEG 파일만 업로드할 수 있습니다."),
    "FILE_TOO_LARGE": (413, "파일 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요."),
    "INVALID_IMAGE": (400, "이미지를 불러오지 못했습니다. 다른 파일로 다시 시도해주세요."),
    "INVALID_CVD_TYPE": (422, "색각이상 유형을 선택해주세요."),
    "INVALID_MODE": (422, "모드 정보가 올바르지 않습니다."),
    "ANALYSIS_FAILED": (500, "분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."),
}


def api_error(code: str) -> HTTPException:
    status, message = MESSAGES[code]
    return HTTPException(status_code=status, detail={"code": code, "message": message})
