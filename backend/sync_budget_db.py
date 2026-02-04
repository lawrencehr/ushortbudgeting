import json
import os
import sys
from sqlmodel import Session, select

# Add backend directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import BudgetCategory, BudgetGrouping

def sync_budget_structure():
    print("Starting budget structure synchronization...")
    
    # 1. Load the reference data
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'budget_data.json')
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r') as f:
        target_categories = json.load(f)

    with Session(engine) as session:
        # Get all categories in the DB (assuming single budget for now, or just update all matching codes across all budgets)
        # To be safe, we should probably fetch per budget, but if codes are universal, we can update strictly by code.
        # However, Code is not unique across budgets.
        # So we should find all Budgets, and for each budget, apply the template.
        
        from models import Budget
        budgets = session.exec(select(Budget)).all()
        print(f"Found {len(budgets)} budgets to process.")

        for budget in budgets:
            print(f"Processing Budget: {budget.name} (ID: {budget.id})")
            
            for target_cat in target_categories:
                target_code = target_cat['code']
                target_name = target_cat['name']
                
                # Try finding existing category by Code
                db_cat = session.exec(
                    select(BudgetCategory)
                    .where(BudgetCategory.budget_id == budget.id)
                    .where(BudgetCategory.code == target_code)
                ).first()
                
                # Fallback: Find by Name if Code mismatch (e.g. E(b) -> E)
                if not db_cat:
                    db_cat = session.exec(
                        select(BudgetCategory)
                        .where(BudgetCategory.budget_id == budget.id)
                        .where(BudgetCategory.name == target_name)
                    ).first()
                    
                # Special legacy handling for E vs E(b) if names also differ slightly
                if not db_cat and (target_code == "E" or target_code == "E(b)"):
                     db_cat = session.exec(
                        select(BudgetCategory)
                        .where(BudgetCategory.budget_id == budget.id)
                        .where((BudgetCategory.code == "E") | (BudgetCategory.code == "E(b)"))
                    ).first()
                
                if db_cat:
                    # Update Name and ensure Code is correct
                    if db_cat.name != target_name:
                        print(f"  Updating Category {target_code}: '{db_cat.name}' -> '{target_name}'")
                        db_cat.name = target_name
                    
                    if db_cat.code != target_code:
                         print(f"  Updating Category Code: '{db_cat.code}' -> '{target_code}'")
                         db_cat.code = target_code
                         
                    session.add(db_cat)
                    
                    # Process Groupings
                    for target_grp in target_cat.get('groupings', []):
                        grp_code = target_grp['code']
                        grp_name = target_grp['name']
                        
                        # Find grouping
                        # Note: Grouping code might be "A.1" or "General Items" (empty code?)
                        # In JSON, General items have code "".
                        # We match by Code, BUT if code is empty, we might match by Name? 
                        # Or simple assumption: If code is "", verify name contains "General".
                        
                        query = select(BudgetGrouping).where(BudgetGrouping.category_id == db_cat.id)
                        if grp_code:
                            query = query.where(BudgetGrouping.code == grp_code)
                        else:
                            # If target code is empty (General), look for empty code OR "General" in name
                            # But safest is just look for empty code.
                            query = query.where(BudgetGrouping.code == "")
                            
                        db_grp = session.exec(query).first()
                        
                        if db_grp:
                            if db_grp.name != grp_name:
                                print(f"    Updating Grouping {grp_code}: '{db_grp.name}' -> '{grp_name}'")
                                db_grp.name = grp_name
                                session.add(db_grp)
                        else:
                            # Create if missing
                            print(f"    Creating Missing Grouping: {grp_code} - {grp_name}")
                            new_grp = BudgetGrouping(
                                code=grp_code,
                                name=grp_name,
                                category_id=db_cat.id
                            )
                            session.add(new_grp)
                    
                    # Cleanup: Remove groupings that are NOT in target_cat
                    # Get all current DB groupings for this category
                    current_db_grps = session.exec(select(BudgetGrouping).where(BudgetGrouping.category_id == db_cat.id)).all()
                    
                    # Build list of valid codes
                    valid_codes = [g['code'] for g in target_cat.get('groupings', [])]
                    
                    for grp in current_db_grps:
                        # If Code is not in valid_codes...
                        # BE CAREFUL: "General" groupings often have empty code.
                        # Target has code "" for General.
                        # If we have multiple empty codes? (Shouldn't happen per structure).
                        
                        if grp.code not in valid_codes:
                            print(f"    Deleting Obsolete Grouping: {grp.code} - {grp.name}")
                            session.delete(grp)
                            
                else:
                    # Category not found. Should we create it?
                    # User asked to fix formatting. If category is missing, we probably should create it to ensure full structure.
                    print(f"  Creating Missing Category: {target_code} - {target_name}")
                    new_cat = BudgetCategory(
                        code=target_code,
                        name=target_name,
                        budget_id=budget.id
                    )
                    session.add(new_cat)
                    session.commit() # Commit to get ID
                    session.refresh(new_cat)
                    
                    # Create groupings
                    for target_grp in target_cat.get('groupings', []):
                        grp_code = target_grp['code']
                        grp_name = target_grp['name']
                        new_grp = BudgetGrouping(
                            code=grp_code,
                            name=grp_name,
                            category_id=new_cat.id
                        )
                        session.add(new_grp)
                        
            session.commit()
            print("Budget processed successfully.")

if __name__ == "__main__":
    sync_budget_structure()
