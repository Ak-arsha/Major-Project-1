from fastapi import APIRouter, HTTPException, status
from backend.database import get_db_connection
from backend.schemas import DoctorCreateRequest, HospitalCreateRequest

router = APIRouter(prefix="/api", tags=["Doctors & Hospitals"])


@router.get("/doctors")
def get_doctors(
    city: str | None = None,
    specialization: str | None = None,
    search: str | None = None,
    hospital_id: int | None = None,
):
    conn = get_db_connection()

    try:
        query = """
            SELECT
                d.doctor_id,
                d.composite_doctor_id,
                d.doctor_name,
                d.doctor_type,
                d.experience_years,
                d.location,
                d.fees,
                d.city,
                d.hospital_id,
                h.hospital_name
            FROM doctors d
            LEFT JOIN hospitals h
                ON d.hospital_id = h.hospital_id
            WHERE 1=1
        """

        params = []

        if city:
            query += " AND LOWER(d.city) LIKE LOWER(?)"
            params.append(f"%{city}%")

        if specialization:
            query += " AND LOWER(d.doctor_type) LIKE LOWER(?)"
            params.append(f"%{specialization}%")

        if hospital_id is not None:
            query += " AND d.hospital_id = ?"
            params.append(hospital_id)

        if search:
            query += """
                AND (
                    LOWER(d.doctor_name) LIKE LOWER(?)
                    OR LOWER(d.doctor_type) LIKE LOWER(?)
                    OR LOWER(h.hospital_name) LIKE LOWER(?)
                )
            """
            params.extend([f"%{search}%"] * 3)

        query += " ORDER BY d.doctor_name"

        rows = conn.execute(query, params).fetchall()

        return {
            "total": len(rows),
            "doctors": [dict(row) for row in rows],
        }

    finally:
        conn.close()


# ---------------- HOSPITAL APIs ----------------


@router.get("/hospitals")
def get_hospitals(
    city: str | None = None,
    search: str | None = None,
):
    conn = get_db_connection()

    try:
        query = """
            SELECT
                h.hospital_id,
                h.hospital_name,
                h.city,
                COUNT(d.doctor_id) AS doctor_count
            FROM hospitals h
            LEFT JOIN doctors d
                ON h.hospital_id = d.hospital_id
            WHERE 1=1
        """

        params = []

        if city:
            query += " AND LOWER(h.city) LIKE LOWER(?)"
            params.append(f"%{city}%")

        if search:
            query += " AND LOWER(h.hospital_name) LIKE LOWER(?)"
            params.append(f"%{search}%")

        query += """
            GROUP BY h.hospital_id, h.hospital_name, h.city
            ORDER BY h.hospital_name
        """

        rows = conn.execute(query, params).fetchall()

        return {
            "total": len(rows),
            "hospitals": [dict(row) for row in rows],
        }

    finally:
        conn.close()


# -------- DOCTORS BELONGING TO A HOSPITAL --------


@router.get("/hospitals/{hospital_id}/doctors")
def get_hospital_doctors(hospital_id: int):
    conn = get_db_connection()

    try:
        hospital = conn.execute(
            "SELECT * FROM hospitals WHERE hospital_id = ?",
            (hospital_id,),
        ).fetchone()

        if hospital is None:
            raise HTTPException(
                status_code=404,
                detail="Hospital not found",
            )

        rows = conn.execute(
            """
            SELECT doctor_id, composite_doctor_id, doctor_name, doctor_type,
                   experience_years, fees, city, location, hospital_id
            FROM doctors
            WHERE hospital_id = ?
            ORDER BY doctor_name
            """,
            (hospital_id,),
        ).fetchall()

        return {
            "hospital": dict(hospital),
            "total_doctors": len(rows),
            "doctors": [dict(row) for row in rows],
        }

    finally:
        conn.close()


@router.post("/doctors", status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreateRequest):
    """Register a new clinician into the doctors database."""
    conn = get_db_connection()

    try:
        # Check or create hospital
        hospital_id = payload.hospital_id
        if not hospital_id:
            hosp_row = conn.execute(
                "SELECT hospital_id FROM hospitals WHERE LOWER(hospital_name) = LOWER(?) AND LOWER(city) = LOWER(?)",
                (payload.hospital_name.strip(), payload.city.strip())
            ).fetchone()
            if hosp_row:
                hospital_id = hosp_row["hospital_id"]
            else:
                h_cur = conn.execute(
                    "INSERT INTO hospitals (hospital_name, city) VALUES (?, ?)",
                    (payload.hospital_name.strip(), payload.city.strip())
                )
                hospital_id = h_cur.lastrowid

        # Normalize doctor name
        name = payload.doctor_name.strip()
        if not name.lower().startswith("dr.") and not name.lower().startswith("dr "):
            name = f"Dr. {name}"

        # Generate composite id
        clean_loc = payload.location.strip().lower()
        clean_city = payload.city.strip().lower()
        loc_str = f"{clean_loc} , {clean_city}" if clean_city not in clean_loc else clean_loc
        composite_id = f"{name.lower()}_{payload.doctor_type.strip().lower()}_{loc_str}"

        # Insert doctor
        cursor = conn.execute(
            """
            INSERT INTO doctors (
                composite_doctor_id, doctor_name, doctor_type,
                experience_years, location, fees, city, hospital_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                composite_id,
                name,
                payload.doctor_type.strip(),
                payload.experience_years,
                payload.location.strip(),
                payload.fees,
                payload.city.strip(),
                hospital_id
            )
        )
        doctor_id = cursor.lastrowid

        # Seed standard weekly outpatient clinic schedules (Monday to Saturday, 09:00 - 17:00)
        days = [
            (1, "Monday"),
            (2, "Tuesday"),
            (3, "Wednesday"),
            (4, "Thursday"),
            (5, "Friday"),
            (6, "Saturday")
        ]
        for day_num, day_str in days:
            conn.execute(
                """
                INSERT INTO doctor_schedules (
                    doctor_id, day_of_week, day_name, start_time, end_time,
                    slot_duration_minutes, avg_waiting_minutes, source_dataset
                ) VALUES (?, ?, ?, '09:00:00', '17:00:00', 20, 15.0, 'user_registered')
                """,
                (doctor_id, day_num, day_str)
            )

        conn.commit()

        # Fetch newly created doctor
        created = conn.execute(
            """
            SELECT d.doctor_id, d.composite_doctor_id, d.doctor_name, d.doctor_type,
                   d.experience_years, d.location, d.fees, d.city, d.hospital_id,
                   h.hospital_name
            FROM doctors d
            LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
            WHERE d.doctor_id = ?
            """,
            (doctor_id,)
        ).fetchone()

        result = dict(created)
        result["phone"] = payload.phone
        result["email"] = payload.email
        result["rating"] = 4.9
        result["reviews"] = 1
        result["availableToday"] = True
        return result

    finally:
        conn.close()


@router.post("/hospitals", status_code=status.HTTP_201_CREATED)
def create_hospital(payload: HospitalCreateRequest):
    """Register a new hospital or clinic facility into the database."""
    conn = get_db_connection()

    try:
        existing = conn.execute(
            "SELECT hospital_id, hospital_name, city FROM hospitals WHERE LOWER(hospital_name) = LOWER(?) AND LOWER(city) = LOWER(?)",
            (payload.hospital_name.strip(), payload.city.strip())
        ).fetchone()

        if existing:
            return {
                "hospital_id": existing["hospital_id"],
                "hospital_name": existing["hospital_name"],
                "city": existing["city"],
                "location": payload.location,
                "address": payload.address,
                "phone": payload.phone,
                "emergency_phone": payload.emergency_phone,
                "type": payload.type,
                "doctor_count": 0,
                "message": "Hospital already exists in database"
            }

        cursor = conn.execute(
            "INSERT INTO hospitals (hospital_name, city) VALUES (?, ?)",
            (payload.hospital_name.strip(), payload.city.strip())
        )
        conn.commit()
        hospital_id = cursor.lastrowid

        return {
            "hospital_id": hospital_id,
            "hospital_name": payload.hospital_name.strip(),
            "city": payload.city.strip(),
            "location": payload.location.strip(),
            "address": payload.address.strip(),
            "phone": payload.phone.strip(),
            "emergency_phone": payload.emergency_phone,
            "type": payload.type,
            "doctor_count": 0
        }

    finally:
        conn.close()


@router.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: str):
    """Delete a doctor, their schedules, and all associated appointments from the database."""
    conn = get_db_connection()
    try:
        doc_num = None
        if doctor_id.isdigit():
            doc_num = int(doctor_id)
        else:
            row = conn.execute(
                "SELECT doctor_id FROM doctors WHERE composite_doctor_id = ? OR LOWER(doctor_name) = LOWER(?)",
                (doctor_id, doctor_id)
            ).fetchone()
            if row:
                doc_num = row["doctor_id"]

        if doc_num is not None:
            conn.execute("DELETE FROM appointments WHERE doctor_id = ?", (doc_num,))
            conn.execute("DELETE FROM doctor_schedules WHERE doctor_id = ?", (doc_num,))
            conn.execute("DELETE FROM doctors WHERE doctor_id = ?", (doc_num,))
        else:
            conn.execute("DELETE FROM doctors WHERE composite_doctor_id = ?", (doctor_id,))

        conn.commit()
        return {"success": True, "message": f"Doctor {doctor_id} and associated appointments successfully removed"}
    finally:
        conn.close()


@router.delete("/hospitals/{hospital_id}")
def delete_hospital(hospital_id: str):
    """Delete a hospital, affiliated doctors, and all associated appointments from the database."""
    conn = get_db_connection()
    try:
        h_id = None
        if hospital_id.isdigit():
            h_id = int(hospital_id)
        else:
            row = conn.execute(
                "SELECT hospital_id FROM hospitals WHERE LOWER(hospital_name) = LOWER(?)",
                (hospital_id.strip(),)
            ).fetchone()
            if row:
                h_id = row["hospital_id"]

        if h_id is not None:
            # Delete appointments for all doctors in this hospital
            doc_rows = conn.execute("SELECT doctor_id FROM doctors WHERE hospital_id = ?", (h_id,)).fetchall()
            for d in doc_rows:
                d_id = d["doctor_id"]
                conn.execute("DELETE FROM appointments WHERE doctor_id = ?", (d_id,))
                conn.execute("DELETE FROM doctor_schedules WHERE doctor_id = ?", (d_id,))
            conn.execute("DELETE FROM doctors WHERE hospital_id = ?", (h_id,))
            conn.execute("DELETE FROM hospitals WHERE hospital_id = ?", (h_id,))
        else:
            conn.execute("DELETE FROM hospitals WHERE LOWER(hospital_name) = LOWER(?)", (hospital_id.strip(),))

        conn.commit()
        return {"success": True, "message": f"Hospital {hospital_id} and associated clinicians/appointments successfully removed"}
    finally:
        conn.close()
