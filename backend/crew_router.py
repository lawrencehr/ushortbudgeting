from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models import CrewMember, LaborAllowance

router = APIRouter()

# --- CrewMember Endpoints ---

@router.post("/", response_model=CrewMember)
def create_crew_member(crew: CrewMember, session: Session = Depends(get_session)):
    session.add(crew)
    session.commit()
    session.refresh(crew)
    return crew

@router.get("/", response_model=List[CrewMember])
def read_crew_members(offset: int = 0, limit: int = Query(default=100, le=100), session: Session = Depends(get_session)):
    crews = session.exec(select(CrewMember).offset(offset).limit(limit)).all()
    return crews

@router.get("/{crew_id}", response_model=CrewMember)
def read_crew_member(crew_id: str, session: Session = Depends(get_session)):
    crew = session.get(CrewMember, crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="CrewMember not found")
    return crew

@router.patch("/{crew_id}", response_model=CrewMember)
def update_crew_member(crew_id: str, crew_update: CrewMember, session: Session = Depends(get_session)):
    # Note: crew_update here expects a partial body if we used proper Pydantic schemas (e.g. CrewMemberUpdate)
    # But for MVP using the main model with exclude_unset=True is a pattern, 
    # though SQLModel main models often require all fields if not Optional.
    # We'll stick to a simple update pattern.
    
    db_crew = session.get(CrewMember, crew_id)
    if not db_crew:
        raise HTTPException(status_code=404, detail="CrewMember not found")
    
    crew_data = crew_update.model_dump(exclude_unset=True)
    for key, value in crew_data.items():
        if key != "id": # Protect ID
            setattr(db_crew, key, value)
            
    session.add(db_crew)
    session.commit()
    session.refresh(db_crew)
    return db_crew

@router.delete("/{crew_id}")
def delete_crew_member(crew_id: str, session: Session = Depends(get_session)):
    crew = session.get(CrewMember, crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="CrewMember not found")
    session.delete(crew)
    session.commit()
    return {"ok": True}

# --- Nested Allowance Handling (Optional/Advanced) ---
# For now, simplistic CRUD.
