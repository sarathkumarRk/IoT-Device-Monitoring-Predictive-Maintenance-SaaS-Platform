from pydantic import BaseModel, EmailStr


class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str 


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"