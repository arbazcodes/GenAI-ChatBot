import os
from sqlalchemy import create_engine, MetaData, inspect
from sqlalchemy.ext.automap import automap_base, generate_relationship
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
metadata = MetaData()
Base = automap_base(metadata=metadata)

def _gen_relationship(base, direction, return_fn, attrname, local_cls, referred_cls, **kw):
    # Get all column names for the local class
    column_names = {c.name for c in local_cls.__table__.columns}
    
    # Check for column name conflicts
    if attrname in column_names:
        new_attrname = f"{attrname}_rel"
        return generate_relationship(
            base, direction, return_fn, new_attrname, local_cls, referred_cls, **kw
        )
    return generate_relationship(
        base, direction, return_fn, attrname, local_cls, referred_cls, **kw
    )

Base.prepare(
    engine,
    reflect=True,
    generate_relationship=_gen_relationship,
    classname_for_table=lambda cls, tablename, table: tablename,
    name_for_scalar_relationship=lambda base, local_cls, referred_cls, constraint: f"{referred_cls.__name__.lower()}_rel",
    name_for_collection_relationship=lambda base, local_cls, referred_cls, constraint: f"{referred_cls.__name__.lower()}_rels"
)

def init_schema():
    pass

def get_schema_context() -> str:
    schema_lines = []
    inspector = inspect(engine)
    
    for table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        column_list = ", ".join([f"{col['name']} ({col['type']})" for col in columns])
        schema_lines.append(f"Table: {table_name} -> {column_list}")
    
    return "\n".join(schema_lines)

def get_table_names() -> list:
    inspector = inspect(engine)
    return inspector.get_table_names()