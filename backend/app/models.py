from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, Enum, ForeignKey, DateTime, func, UniqueConstraint, Table
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .database import Base
import enum

class Role(str, enum.Enum):
    admin = "admin"
    cashier = "cashier"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.admin, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    base_price: Mapped[float] = mapped_column(Numeric(12,2))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category")
    option_groups = relationship("OptionGroup", secondary="product_option_groups", back_populates="products")

class SelectType(str, enum.Enum):
    single = "single"
    multi = "multi"

class OptionGroup(Base):
    __tablename__ = "option_groups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    select_type: Mapped[SelectType] = mapped_column(Enum(SelectType), default=SelectType.single)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)

    items = relationship("OptionItem", cascade="all, delete-orphan", back_populates="group")
    products = relationship("Product", secondary="product_option_groups", back_populates="option_groups")

class OptionItem(Base):
    __tablename__ = "option_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("option_groups.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    price: Mapped[float] = mapped_column(Numeric(12,2), default=0)
    image_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)  # <<<<<< добавили

    group = relationship("OptionGroup", back_populates="items")

product_option_groups = Table(
    "product_option_groups", Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", ForeignKey("option_groups.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("product_id", "group_id")
)

# ---- Orders ----
class OrderStatus(str, enum.Enum):
    active = "active"
    closed = "closed"

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    take_away: Mapped[bool] = mapped_column(Boolean, default=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.active, index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    closed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Ежедневный гостевой номер и дата его присвоения
    guest_seq: Mapped[int] = mapped_column(Integer, nullable=False)
    guest_date: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items = relationship("OrderItem", cascade="all, delete-orphan", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    name_snapshot: Mapped[str] = mapped_column(String(255))
    unit_price: Mapped[float] = mapped_column(Numeric(12,2))
    qty: Mapped[int] = mapped_column(Integer)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    options = relationship("OrderItemOption", cascade="all, delete-orphan", back_populates="item")

class OrderItemOption(Base):
    __tablename__ = "order_item_options"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"), index=True)
    option_item_id: Mapped[int] = mapped_column(ForeignKey("option_items.id", ondelete="SET NULL"), nullable=True)
    name_snapshot: Mapped[str] = mapped_column(String(120))
    price: Mapped[float] = mapped_column(Numeric(12,2))

    item = relationship("OrderItem", back_populates="options")
    option_item = relationship("OptionItem")
