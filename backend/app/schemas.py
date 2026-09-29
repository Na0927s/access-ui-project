from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .services.color import HEX_RE

CvdType = Literal["protan", "deutan", "tritan"]


class Element(BaseModel):
    selector: str = Field(max_length=300)
    text: str = Field(default="", max_length=500)
    color: str
    background: str
    font_size_px: float | None = Field(default=None, ge=0, le=500)
    font_weight: int | None = Field(default=None, ge=100, le=1000)

    @field_validator("color", "background")
    @classmethod
    def check_hex(cls, v: str) -> str:
        if not HEX_RE.match(v):
            raise ValueError("color must be #RRGGBB")
        return v if v.startswith("#") else "#" + v


class DeveloperRequest(BaseModel):
    cvd_type: CvdType
    lang: Literal["ko", "en"] = "ko"
    elements: list[Element] = Field(min_length=1, max_length=500)


class ExplainRequest(BaseModel):
    lang: Literal["ko", "en"] = "ko"
    mode: Literal["user", "developer"] = "user"
    analysis: dict[str, Any]


class TranslateRequest(BaseModel):
    target_lang: Literal["ko", "en"]
    texts: list[str] = Field(min_length=1, max_length=50)
