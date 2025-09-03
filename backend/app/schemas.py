from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    role: str
    class Config: from_attributes = True

class CategoryOut(BaseModel):
    id: int
    name: str
    class Config: from_attributes = True

class ProductOut(BaseModel):
    id: int
    name: str
    base_price: float
    description: Optional[str]
    category_name: Optional[str]
    image_url: Optional[str]
    option_group_ids: List[int] = []

class DashboardStats(BaseModel):
    day_sales: float
    month_sales: float
    day_orders: int
    month_orders: int

class HourPoint(BaseModel):
    hour: int
    orders: int

class RecentOrder(BaseModel):
    id: int
    customer_name: str
    total: float
    created_at: datetime

# ---- Orders ----
class OrderItemIn(BaseModel):
    product_id: int
    qty: int
    option_item_ids: List[int] = []
    # НОВОЕ: база единицы с учётом скидки (без опций)
    unit_price_base: Optional[float] = None
    # НОВОЕ: суффикс для названия (например, " [-20%]")
    name_suffix: Optional[str] = None

class OrderCreateIn(BaseModel):
    customer_name: str
    take_away: bool = False
    items: List[OrderItemIn]

class OrderItemOut(BaseModel):
    name: str
    quantity: int

class OrderOut(BaseModel):
    id: int
    customer_name: str
    take_away: bool
    items: List[OrderItemOut]
    total: float
    created_at: datetime

class OrdersFeed(BaseModel):
    active: List[OrderOut]
    recent_closed: List[OrderOut]

class OptionItemOut(BaseModel):
    id: int
    name: str
    price: float
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

class OptionGroupOut(BaseModel):
    id: int
    name: str
    select_type: str
    is_required: bool
    items: List[OptionItemOut]
    class Config:
        from_attributes = True
