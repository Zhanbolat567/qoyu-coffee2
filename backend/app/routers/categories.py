from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models
from ..schemas import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name).all()
