from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import check_password, current_user, hash_password, make_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Register(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class Login(BaseModel):
    email: EmailStr
    password: str


def _out(u: User):
    return {"token": make_token(u.id), "user": {"id": u.id, "name": u.name, "email": u.email}}


@router.post("/register")
def register(body: Register, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, "An account with this email already exists.")
    u = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    db.add(u)
    db.commit()
    return _out(u)


@router.post("/login")
def login(body: Login, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(email=body.email.lower()).first()
    if not u or not check_password(body.password, u.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    return _out(u)


@router.get("/me")
def me(u: User = Depends(current_user)):
    return {"id": u.id, "name": u.name, "email": u.email}
