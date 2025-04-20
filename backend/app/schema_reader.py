# backend/app/schema_reader.py
import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.automap import automap_base
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")  # e.g.: postgresql://user:pass@localhost:5432/mydb

engine = create_engine(DATABASE_URL)
metadata = MetaData()
Base = automap_base(metadata=metadata)
Base.prepare(engine, reflect=True)

def init_schema():
    # Reflection already occurs at Base.prepare.
    pass

def get_schema_context() -> str:
    schema_lines = []
    for cls in Base.classes:
        table = cls.__table__
        columns = ", ".join([f"{col.name} ({col.type})" for col in table.columns])
        schema_lines.append(f"Table: {table.name} -> {columns}")
    return "\n".join(schema_lines)

def get_table_names() -> list:
    return [cls.__table__.name for cls in Base.classes]
