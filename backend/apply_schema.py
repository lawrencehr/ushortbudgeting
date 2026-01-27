from database import create_db_and_tables, engine
from sqlmodel import SQLModel
# Import models so they are registered with SQLModel
from models import *

if __name__ == "__main__":
    print("Creating database and tables...")
    create_db_and_tables()
    print("Done.")
