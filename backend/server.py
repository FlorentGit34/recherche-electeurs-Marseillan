from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import pandas as pd
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

class Voter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nom: str
    prenom: str
    date_naissance: str = ""
    bureau: int
    numero_electeur: str
    carte_a_donner: bool = False

class SearchResponse(BaseModel):
    total: int
    results: List[Voter]

class UploadResponse(BaseModel):
    message: str
    count: int

class CountResponse(BaseModel):
    count: int

@api_router.get("/")
async def root():
    return {"message": "API Recherche Electeurs"}

@api_router.post("/upload", response_model=UploadResponse)
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Le fichier doit etre un fichier Excel (.xlsx ou .xls)")
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier: {str(e)}")
    col_map = {}
    for col in df.columns:
        col_lower = str(col).strip().lower()
        if col_lower in ('nom', 'name', 'last_name', 'lastname'):
            col_map['nom'] = col
        elif col_lower in ('prenom', 'prénom', 'firstname', 'first_name', 'prénoms', 'prenoms'):
            col_map['prenom'] = col
        elif col_lower in ('bureau', 'bureau de vote', 'bureau_vote'):
            col_map['bureau'] = col
        elif col_lower in ('numeroelecteur', 'numero_electeur', 'numéro électeur', 'numero electeur', 'num_electeur', 'n°', 'numero', 'numéro'):
            col_map['numero_electeur'] = col
        elif col_lower in ('carte_a_donner', 'carte a donner', 'carte electorale a donner', 'carte électorale à donner', 'carte', 'a donner', 'à donner'):
            col_map['carte_a_donner'] = col
        elif col_lower in ('date_naissance', 'date de naissance', 'naissance', 'datenaissance', 'date naissance', 'né(e) le', 'ne le', 'née le'):
            col_map['date_naissance'] = col
    if len(col_map) < 4:
        available = list(df.columns)
        missing = []
        for key in ['nom', 'prenom', 'bureau', 'numero_electeur']:
            if key not in col_map:
                missing.append(key)
        raise HTTPException(status_code=400, detail=f"Colonnes manquantes: {missing}. Colonnes disponibles: {available}")
    await db.voters.delete_many({})
    voters = []
    for _, row in df.iterrows():
        try:
            nom_val = str(row[col_map['nom']]).strip().upper()
            prenom_val = str(row[col_map['prenom']]).strip().title()
            bureau_val = int(row[col_map['bureau']])
            numero_val = str(row[col_map['numero_electeur']]).strip()
            if bureau_val < 1 or bureau_val > 8:
                continue
            carte_val = False
            if 'carte_a_donner' in col_map:
                raw = str(row[col_map['carte_a_donner']]).strip().lower()
                carte_val = raw in ('oui', 'yes', '1', 'true', 'x', 'o')
            date_naiss = ""
            if 'date_naissance' in col_map:
                raw_date = row[col_map['date_naissance']]
                if pd.notna(raw_date):
                    if hasattr(raw_date, 'strftime'):
                        date_naiss = raw_date.strftime('%d/%m/%Y')
                    else:
                        date_naiss = str(raw_date).strip()
            voters.append({
                "nom": nom_val,
                "prenom": prenom_val,
                "date_naissance": date_naiss,
                "bureau": bureau_val,
                "numero_electeur": numero_val,
                "carte_a_donner": carte_val
            })
        except (ValueError, TypeError):
            continue
    if voters:
        await db.voters.insert_many(voters)
    await db.voters.create_index([("nom", 1)])
    await db.voters.create_index([("prenom", 1)])
    return UploadResponse(message=f"{len(voters)} electeurs importes avec succes", count=len(voters))

@api_router.get("/search", response_model=SearchResponse)
async def search_voters(q: str = ""):
    if not q or len(q.strip()) < 1:
        return SearchResponse(total=0, results=[])
    query_str = q.strip()
    escaped = re.escape(query_str)
    pipeline = [
        {"$addFields": {"full_name": {"$concat": ["$nom", " ", "$prenom"]}, "full_name_reverse": {"$concat": ["$prenom", " ", "$nom"]}}},
        {"$match": {"$or": [{"nom": {"$regex": escaped, "$options": "i"}}, {"prenom": {"$regex": escaped, "$options": "i"}}, {"full_name": {"$regex": escaped, "$options": "i"}}, {"full_name_reverse": {"$regex": escaped, "$options": "i"}}]}},
        {"$project": {"_id": 0, "nom": 1, "prenom": 1, "date_naissance": 1, "bureau": 1, "numero_electeur": 1, "carte_a_donner": 1}},
        {"$sort": {"nom": 1, "prenom": 1}},
        {"$limit": 500}
    ]
    results = await db.voters.aggregate(pipeline).to_list(500)
    return SearchResponse(total=len(results), results=results)

@api_router.get("/voters/count", response_model=CountResponse)
async def get_voter_count():
    count = await db.voters.count_documents({})
    return CountResponse(count=count)

@api_router.post("/seed")
async def seed_demo_data():
    existing = await db.voters.count_documents({})
    if existing > 0:
        return {"message": f"Base deja peuplee avec {existing} electeurs", "count": existing}
    demo_voters = [
        {"nom": "DUPONT", "prenom": "Jean", "date_naissance": "15/03/1985", "bureau": 1, "numero_electeur": "001234", "carte_a_donner": False},
        {"nom": "DUPONT", "prenom": "Marie", "date_naissance": "22/07/1990", "bureau": 1, "numero_electeur": "001235", "carte_a_donner": True},
        {"nom": "MARTIN", "prenom": "Pierre", "date_naissance": "08/11/1972", "bureau": 2, "numero_electeur": "002345", "carte_a_donner": False},
        {"nom": "MARTIN", "prenom": "Sophie", "date_naissance": "30/01/1988", "bureau": 3, "numero_electeur": "003456", "carte_a_donner": False},
        {"nom": "BERNARD", "prenom": "Luc", "date_naissance": "14/06/1965", "bureau": 4, "numero_electeur": "004567", "carte_a_donner": True},
        {"nom": "BERNARD", "prenom": "Claire", "date_naissance": "03/09/1993", "bureau": 5, "numero_electeur": "005678", "carte_a_donner": False},
        {"nom": "PETIT", "prenom": "Antoine", "date_naissance": "27/12/1980", "bureau": 6, "numero_electeur": "006789", "carte_a_donner": False},
        {"nom": "ROBERT", "prenom": "Isabelle", "date_naissance": "19/04/1975", "bureau": 7, "numero_electeur": "007890", "carte_a_donner": True},
        {"nom": "RICHARD", "prenom": "Thomas", "date_naissance": "05/02/1998", "bureau": 8, "numero_electeur": "008901", "carte_a_donner": False},
        {"nom": "DURAND", "prenom": "Camille", "date_naissance": "11/08/1982", "bureau": 1, "numero_electeur": "009012", "carte_a_donner": False},
        {"nom": "LEROY", "prenom": "Nicolas", "date_naissance": "23/05/1970", "bureau": 2, "numero_electeur": "010123", "carte_a_donner": False},
        {"nom": "MOREAU", "prenom": "Julie", "date_naissance": "16/10/1995", "bureau": 3, "numero_electeur": "011234", "carte_a_donner": False},
        {"nom": "SIMON", "prenom": "Marc", "date_naissance": "09/07/1968", "bureau": 4, "numero_electeur": "012345", "carte_a_donner": False},
        {"nom": "LAURENT", "prenom": "Emilie", "date_naissance": "01/03/1991", "bureau": 5, "numero_electeur": "013456", "carte_a_donner": True},
        {"nom": "LEFEBVRE", "prenom": "David", "date_naissance": "28/11/1984", "bureau": 6, "numero_electeur": "014567", "carte_a_donner": False},
        {"nom": "MICHEL", "prenom": "Nathalie", "date_naissance": "07/06/1977", "bureau": 7, "numero_electeur": "015678", "carte_a_donner": False},
        {"nom": "GARCIA", "prenom": "Philippe", "date_naissance": "20/01/1963", "bureau": 8, "numero_electeur": "016789", "carte_a_donner": False},
        {"nom": "THOMAS", "prenom": "Sandrine", "date_naissance": "12/09/1986", "bureau": 1, "numero_electeur": "017890", "carte_a_donner": False},
        {"nom": "FOURNIER", "prenom": "Christophe", "date_naissance": "04/04/1979", "bureau": 2, "numero_electeur": "018901", "carte_a_donner": False},
        {"nom": "LAMBERT", "prenom": "Veronique", "date_naissance": "25/12/1992", "bureau": 3, "numero_electeur": "019012", "carte_a_donner": False},
    ]
    await db.voters.insert_many(demo_voters)
    await db.voters.create_index([("nom", 1)])
    await db.voters.create_index([("prenom", 1)])
    return {"message": f"{len(demo_voters)} electeurs de demonstration ajoutes", "count": len(demo_voters)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
