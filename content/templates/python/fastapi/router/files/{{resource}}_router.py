from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/{{resource}}", tags=["{{resource}}"])


class {{Resource}}In(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class {{Resource}}Out({{Resource}}In):
    id: str


def get_store():
    # TODO: 换成真实的数据访问层
    return {}


@router.get("/{item_id}", response_model={{Resource}}Out)
async def get_{{resource}}(item_id: str, store=Depends(get_store)):
    row = store.get(item_id)
    if row is None:
        raise HTTPException(status_code=404, detail="{{Resource}} not found")
    return row


@router.post("", response_model={{Resource}}Out, status_code=201)
async def create_{{resource}}(body: {{Resource}}In, store=Depends(get_store)):
    # TODO: 换成真实写入
    return {"id": "generated-id", **body.model_dump()}
