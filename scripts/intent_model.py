from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, validator

FieldType = Literal["string", "longtext", "date", "enum", "number", "email", "phone", "bool"]

class AutodetectConfig(BaseModel):
    keywords: List[str] = Field(default_factory=list)
    boosts: Dict[str, float] = Field(default_factory=dict)

class TemplateConfig(BaseModel):
    subject: str
    bodyPath: str  # path to templates/{id}.j2 (md/html handled by extension)

class IntentTests(BaseModel):
    samples: List[Dict] = Field(default_factory=list)

class IntentSpec(BaseModel):
    id: str
    label: str
    description: Optional[str] = ""
    required: List[str] = Field(default_factory=list)
    optional: List[str] = Field(default_factory=list)

    # field metadata
    fieldTypes: Dict[str, FieldType] = Field(default_factory=dict)
    enums: Dict[str, List[str]] = Field(default_factory=dict)
    hints: Dict[str, str] = Field(default_factory=dict)

    # template + autodetect + tests
    template: TemplateConfig
    autodetect: AutodetectConfig = Field(default_factory=AutodetectConfig)
    tests: IntentTests = Field(default_factory=IntentTests)

    @validator("id")
    def _id_is_snake(cls, v: str) -> str:
        if not v or not v.replace("_", "").isalnum() or v.lower() != v or " " in v:
            raise ValueError("id must be snake_case, lowercase, alnum+underscore only")
        return v

    @validator("required", "optional", each_item=True)
    def _fields_are_camel(cls, v: str) -> str:
        # CamelCase preference: allow simple lowercase too, just forbid spaces and special chars
        if " " in v or not v.replace("_", "").isalnum():
            raise ValueError("field names must be alnum/underscore without spaces")
        return v

    @validator("fieldTypes")
    def _field_types_cover_declared(cls, v: Dict[str, FieldType], values) -> Dict[str, FieldType]:
        wanted = set(values.get("required", [])) | set(values.get("optional", []))
        missing = [f for f in wanted if f not in v]
        if missing:
            raise ValueError(f"fieldTypes missing entries for: {', '.join(missing)}")
        return v

    @validator("enums")
    def _enum_has_options(cls, v: Dict[str, List[str]], values) -> Dict[str, List[str]]:
        # if a field is typed enum, make sure it has options
        field_types: Dict[str, FieldType] = values.get("fieldTypes", {})
        for fname, ftype in field_types.items():
            if ftype == "enum" and fname not in v:
                raise ValueError(f"enum field '{fname}' must define options in 'enums'")
        return v

