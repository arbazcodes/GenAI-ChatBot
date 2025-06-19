import os
from sqlalchemy import MetaData, inspect
from sqlalchemy.ext.automap import automap_base, generate_relationship

# Defer engine creation until after configure_database() is called
engine = None
metadata = MetaData(schema="public")
Base = automap_base(metadata=metadata)

def _gen_relationship(base, direction, return_fn, attrname, local_cls, referred_cls, **kw):
    """Custom relationship namer to avoid column conflicts."""
    column_names = {c.name for c in local_cls.__table__.columns}
    if attrname in column_names:
        attrname = f"{attrname}_rel"
    return generate_relationship(base, direction, return_fn, attrname, local_cls, referred_cls, **kw)

def init_schema(reflect_engine):
    """
    Reflect the database schema into ORM classes.
    Must be called once after engine is configured.
    """
    global engine
    engine = reflect_engine
    metadata.bind = engine
    Base.prepare(
        engine,
        reflect=True,
        schema="public",  # <-- limit reflection to public schema
        generate_relationship=_gen_relationship,
        classname_for_table=lambda base, tablename, table: tablename,
        name_for_scalar_relationship=lambda base, local, remote, fk: f"{remote.__name__.lower()}_rel",
        name_for_collection_relationship=lambda base, local, remote, fk: f"{remote.__name__.lower()}_rels"
    )

def get_schema_context() -> str:
    """
    Return DDL-like lines describing tables and columns.
    """
    if engine is None:
        raise RuntimeError("Schema not initialized. Call init_schema() first.")
    inspector = inspect(engine)
    lines = []
    for table_name in inspector.get_table_names(schema="public"):
        cols = inspector.get_columns(table_name, schema="public")
        col_desc = ", ".join(f"{c['name']} ({c['type']})" for c in cols)
        lines.append(f"Table: {table_name} -> {col_desc}")
    return "\n".join(lines)

def get_schema_context_with_data() -> str:
    """
    Like get_schema_context but excludes example values.
    """
    if engine is None:
        raise RuntimeError("Schema not initialized. Call init_schema() first.")
    inspector = inspect(engine)
    lines = []
    for table in inspector.get_table_names(schema="public"):
        cols = inspector.get_columns(table, schema="public")
        parts = []
        for col in cols:
            desc = f"{col['name']} ({col['type']})"
            parts.append(desc)
        lines.append(f"Table: {table} -> {', '.join(parts)}")
    return "\n".join(lines)

