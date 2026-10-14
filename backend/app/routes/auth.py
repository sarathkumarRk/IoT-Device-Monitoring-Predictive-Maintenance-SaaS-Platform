from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterSchema, LoginSchema, TokenSchema
from app.schemas.user import UserResponse
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Register - First Admin Only
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_admin(
    data: RegisterSchema,
    db: Session = Depends(get_db),
):
    admin_exists = db.query(User).filter(
        User.role == "ADMIN"
    ).first()

    if admin_exists:
        raise HTTPException(
            status_code=403,
            detail="Admin already exists. Registration is closed.",
        )

    name = data.name.strip()
    email = str(data.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty.",
        )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=400,
            detail="Email already registered.",
        )

    admin = User(
        name=name,
        email=email,
        password=hash_password(data.password),
        role="ADMIN",
        is_active=True,
    )

    try:
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to register Admin account.",
        )


# Login - All Roles
@router.post("/login", response_model=TokenSchema)
def login_user(
    data: LoginSchema,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not verify_password(
        data.password,
        user.password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive.",
        )

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# Current Logged-in User
@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user



