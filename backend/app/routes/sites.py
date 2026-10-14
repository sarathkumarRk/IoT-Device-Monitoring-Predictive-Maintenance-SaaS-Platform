from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.site import Site
from app.models.user import User
from app.schemas.site import SiteCreate, SiteResponse
from app.dependencies import get_current_user, admin_required

router = APIRouter(prefix="/sites", tags=["Sites"])


# Create Site - Admin Only
@router.post(
    "/",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_site(
    site_data: SiteCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_required),
):
    site = Site(
        name=site_data.name,
        location=site_data.location,
        created_by=current_admin.id,
    )

    db.add(site)
    db.commit()
    db.refresh(site)

    return site


# List Sites - Authenticated Users
@router.get("/", response_model=list[SiteResponse])
def get_sites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Site).all()


# Get Site by ID - Authenticated Users
@router.get("/{site_id}", response_model=SiteResponse)
def get_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    site = db.query(Site).filter(Site.id == site_id).first()

    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )

    return site
