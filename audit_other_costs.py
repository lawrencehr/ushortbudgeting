
from sqlmodel import Session, select, create_engine
import json
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from main import LineItem, BudgetGrouping, BudgetCategory, Budget, Project

# Connect to DB
sqlite_file_name = "backend/shortkings.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

def audit_other_costs(project_id_prefix=""):
    with Session(engine) as session:
        # Find project
        if project_id_prefix:
             project = session.exec(select(Project).where(Project.id.like(f"%{project_id_prefix}%"))).first()
        else:
             project = session.exec(select(Project)).first() # Default to first
             
        if not project:
            print("No project found")
            return

        print(f"Auditing Project: {project.name} ({project.id})")
        
        budgets = session.exec(select(Budget).where(Budget.project_id == project.id)).all()
        
        other_items = []
        
        for budget in budgets:
            cats = session.exec(select(BudgetCategory).where(BudgetCategory.budget_id == budget.id)).all()
            for cat in cats:
                grps = session.exec(select(BudgetGrouping).where(BudgetGrouping.category_id == cat.id)).all()
                for grp in grps:
                    items = session.exec(select(LineItem).where(LineItem.grouping_id == grp.id)).all()
                    for item in items:
                        item_total = item.total or 0.0
                        if item_total == 0: continue

                        is_other = False
                        reason = ""

                        if not item.breakdown_json:
                            is_other = True
                            reason = "No breakdown_json"
                        else:
                            try:
                                bk = json.loads(item.breakdown_json)
                                # Check if it has the standard keys and if they sum up to total?
                                # The current logic simply adds breakdown parts to phases.
                                # If breakdown exists, it DOES NOT add to Other, UNLESS it crashes.
                                # WAIT: The current logic in main.py adds to Other ONLY if breakdown_json is missing OR parsing fails.
                                # It does NOT add "unaccounted" remainder to Other.
                                pass 
                            except:
                                is_other = True
                                reason = "JSON parse error"
                        
                        if is_other:
                            other_items.append({
                                "category": cat.name,
                                "description": item.description,
                                "total": item_total,
                                "reason": reason
                            })

        print(f"\nFound {len(other_items)} items in 'Other' category:")
        total_other = 0
        for i in other_items:
            print(f"- [${i['total']}] {i['description']} ({i['category']}) -> {i['reason']}")
            total_other += i['total']
            
        print(f"\nTotal 'Other' Cost: ${total_other}")

if __name__ == "__main__":
    audit_other_costs()
