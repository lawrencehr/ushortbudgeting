from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
import json
import uuid

from database import get_session
from models import (
    BudgetTemplate, Budget, BudgetCategory, BudgetGrouping, LineItem, Project
)
from pydantic import BaseModel

router = APIRouter()

# --- Schemas ---

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    budget_id: str
    reset_quantities: bool = True

class TemplateListItem(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    item_count: int
    category_count: int

class InitializeBudgetRequest(BaseModel):
    project_id: Optional[str] = None
    name: str
    template_id: Optional[str] = None
    reset_quantities: bool = True

# --- Helpers ---

def serialize_budget_tree(session: Session, budget_id: str) -> Dict[str, Any]:
    categories = session.exec(
        select(BudgetCategory)
        .where(BudgetCategory.budget_id == budget_id)
        .order_by(BudgetCategory.sort_order)
    ).all()
    
    cat_list = []
    total_items = 0
    
    for cat in categories:
        cat_data = cat.model_dump()
        groupings = session.exec(
            select(BudgetGrouping).where(BudgetGrouping.category_id == cat.id)
        ).all()
        
        grp_list = []
        for grp in groupings:
            grp_data = grp.model_dump()
            items = session.exec(
                select(LineItem).where(LineItem.grouping_id == grp.id)
            ).all()
            
            item_list = [item.model_dump() for item in items]
            grp_data['items'] = item_list
            total_items += len(item_list)
            grp_list.append(grp_data)
            
        cat_data['groupings'] = grp_list
        cat_list.append(cat_data)
        
    return {
        "categories": cat_list,
        "category_count": len(cat_list),
        "item_count": total_items
    }

def clone_structure_to_budget(
    session: Session, 
    budget_id: str, 
    snapshot: Dict[str, Any], 
    reset_quantities: bool
):
    categories = snapshot.get("categories", [])
    
    for i, cat_data in enumerate(categories):
        # Create Category
        new_cat = BudgetCategory(
            name=cat_data["name"],
            code=cat_data.get("code", ""),
            budget_id=budget_id,
            sort_order=i
        )
        session.add(new_cat)
        session.flush() # get ID
        
        # Create Groupings
        for grp_data in cat_data.get("groupings", []):
            new_grp = BudgetGrouping(
                name=grp_data["name"],
                code=grp_data.get("code", ""),
                category_id=new_cat.id
            )
            session.add(new_grp)
            session.flush()
            
            # Create Items
            for item_data in grp_data.get("items", []):
                # Handle reset quantities logic
                qty = 0.0 if reset_quantities else item_data.get("quantity", 0.0)
                total = 0.0 if reset_quantities else item_data.get("total", 0.0)
                
                # Careful with IDs, we must generate new ones
                new_item = LineItem(
                    description=item_data["description"],
                    rate=item_data.get("rate", 0.0),
                    quantity=qty,
                    unit=item_data.get("unit", "day"),
                    total=total,
                    is_labor=item_data.get("is_labor", False),
                    # Labor specifics
                    base_rate=item_data.get("base_rate", 0.0),
                    days_per_week=item_data.get("days_per_week", 5.0),
                    labor_phases_json=item_data.get("labor_phases_json", "[]"),
                    allowances_json=item_data.get("allowances_json", "[]"),
                    grouping_id=new_grp.id
                )
                session.add(new_item)

# --- Endpoints ---

@router.get("/templates", response_model=List[TemplateListItem])
def list_templates(session: Session = Depends(get_session)):
    templates = session.exec(select(BudgetTemplate)).all()
    return templates

@router.get("/templates/{template_id}")
def get_template(template_id: str, session: Session = Depends(get_session)):
    template = session.get(BudgetTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.post("/templates", response_model=BudgetTemplate)
def create_template(req: TemplateCreate, session: Session = Depends(get_session)):
    # 1. Verify source budget exists
    budget = session.get(Budget, req.budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Source budget not found")
    
    # 2. Serialize budget
    tree_data = serialize_budget_tree(session, req.budget_id)
    
    # 3. Create template
    # Apply reset quantities logic to the SNAPSHOT if requested?
    # Or keep snapshot pure and apply on restore?
    # Plan says: "reset_quantities? Whether to zero out quantities" (on save)
    # The 'Initialize' endpoint ALSO has reset_quantities.
    # It sends deeper signal if we wipe it now. But better to keep data in snapshot and wipe on restore?
    # Actually, if I save "My Clean Template", I probably want it clean.
    # Let's wipe if requested.
    
    if req.reset_quantities:
        for cat in tree_data["categories"]:
            cat["total"] = 0
            for grp in cat["groupings"]:
                grp["sub_total"] = 0
                for item in grp["items"]:
                    item["quantity"] = 0
                    item["total"] = 0
                    # Note: we might need to reset phaes json too if we were thorough, but MVP ok.

    template = BudgetTemplate(
        name=req.name,
        description=req.description,
        created_by="user_id_placeholder", # MVP
        source_budget_id=req.budget_id,
        snapshot=tree_data,
        item_count=tree_data["item_count"],
        category_count=tree_data["category_count"]
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template

@router.delete("/templates/{template_id}")
def delete_template(template_id: str, session: Session = Depends(get_session)):
    template = session.get(BudgetTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    session.delete(template)
    session.commit()
    return {"status": "success"}

@router.post("/budget/initialize")
def initialize_budget(req: InitializeBudgetRequest, session: Session = Depends(get_session)):
    # 1. Get or Create Project
    if req.project_id:
        project = session.get(Project, req.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project_id = req.project_id
    else:
        # Create default project if not provided (MVP convenience)
        project = session.exec(select(Project)).first()
        if not project:
            project = Project(name="Demo Project", client="Internal")
            session.add(project)
            session.commit()
            session.refresh(project)
        project_id = project.id

    # 2. Create Budget
    new_budget = Budget(name=req.name, project_id=project_id)
    session.add(new_budget)
    session.commit()
    session.refresh(new_budget)
    
    # 3. Apply Template if provided
    if req.template_id:
        template = session.get(BudgetTemplate, req.template_id)
        if not template:
            # If template not found, maybe just return empty budget?
            # Or fail? Fail is safer.
            raise HTTPException(status_code=404, detail="Template not found")
            
        snapshot = template.snapshot
        # clone_structure checks for snapshot integrity
        if snapshot:
            clone_structure_to_budget(session, new_budget.id, snapshot, req.reset_quantities)
            session.commit()
            
    return {"budget_id": new_budget.id, "project_id": project_id}
