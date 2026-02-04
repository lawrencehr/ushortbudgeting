from sqlmodel import create_engine, text

sqlite_file_name = "shortkings.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

def apply_migration():
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # 1. Add daily_hours
            try:
                connection.execute(text("ALTER TABLE lineitem ADD COLUMN daily_hours FLOAT DEFAULT 0.0"))
                print("Added daily_hours")
            except Exception as e:
                print(f"daily_hours exists or error: {e}")

            # 2. Add is_casual
            try:
                connection.execute(text("ALTER TABLE lineitem ADD COLUMN is_casual BOOLEAN DEFAULT 0"))
                print("Added is_casual")
            except Exception as e:
                print(f"is_casual exists or error: {e}")

            # 3. Rename base_rate -> base_hourly_rate
            try:
                connection.execute(text("ALTER TABLE lineitem RENAME COLUMN base_rate TO base_hourly_rate"))
                print("Renamed base_rate")
            except Exception as e:
                print(f"base_rate rename failed (maybe already done?): {e}")
                # Fallback: Check if base_hourly_rate exists, if not add it
                try:
                    connection.execute(text("ALTER TABLE lineitem ADD COLUMN base_hourly_rate FLOAT DEFAULT 0.0"))
                    print("Added base_hourly_rate (fallback)")
                except Exception as ex:
                    print(f"base_hourly_rate exists: {ex}")

            trans.commit()
            print("Migration applied successfully.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    apply_migration()
