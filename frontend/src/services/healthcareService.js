const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://healthcare-navigator-api-phi.vercel.app');

// Verified testing clinician & clinic profiles interconnected between Patient and Doctor portals
export const VERIFIED_TESTING_DOCTOR = {
  doctor_id: 'doc-ananya-rao',
  doctor_name: 'Dr. Ananya Rao',
  doctor_type: 'Pulmonology',
  specialization: 'Pulmonology',
  experience_years: 14,
  fees: 800,
  city: 'Delhi',
  location: 'Connaught Place',
  hospital_id: 'hosp-sunrise-chest',
  hospital_name: 'Sunrise Chest & Allergy Clinic',
  phone: '+91 90000 00000',
  email: 'doctor@healthnavigator.ai',
  rating: 4.8,
  reviews: 240,
  availableToday: true,
};

export const VERIFIED_TESTING_HOSPITAL = {
  hospital_id: 'hosp-sunrise-chest',
  hospital_name: 'Sunrise Chest & Allergy Clinic',
  city: 'Delhi',
  location: 'Connaught Place',
  address: 'Block B, Inner Circle, Connaught Place, New Delhi',
  type: 'Super Specialty Clinic',
  phone: '+91 11 4567 8900',
};

// Cache previously fetched data
let doctorsCache = null;
let hospitalsCache = null;

async function fetchData(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trim().startsWith('<')) {
      throw new Error('Server returned HTML response instead of JSON. Check backend API URL.');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON received from server.');
    }
  }

  if (!response.ok) {
    throw new Error('Unable to fetch healthcare data.');
  }

  return response.json();
}

function doctorMatchesFilter(doc, filters = {}) {
  if (filters.city && String(doc.city || '').toLowerCase() !== String(filters.city).toLowerCase()) {
    return false;
  }
  if (
    filters.specialization &&
    !String(doc.doctor_type || doc.specialization || '')
      .toLowerCase()
      .includes(String(filters.specialization).toLowerCase())
  ) {
    return false;
  }
  if (filters.search) {
    const s = String(filters.search).toLowerCase();
    const matchesName = String(doc.doctor_name || '').toLowerCase().includes(s);
    const matchesSpec = String(doc.doctor_type || doc.specialization || '').toLowerCase().includes(s);
    const matchesHosp = String(doc.hospital_name || '').toLowerCase().includes(s);
    const matchesCity = String(doc.city || '').toLowerCase().includes(s);
    if (!matchesName && !matchesSpec && !matchesHosp && !matchesCity) return false;
  }
  return true;
}

function hospitalMatchesFilter(hosp, filters = {}) {
  if (filters.city && String(hosp.city || '').toLowerCase() !== String(filters.city).toLowerCase()) {
    return false;
  }
  if (filters.search) {
    const s = String(filters.search).toLowerCase();
    const matchesName = String(hosp.hospital_name || '').toLowerCase().includes(s);
    const matchesCity = String(hosp.city || '').toLowerCase().includes(s);
    if (!matchesName && !matchesCity) return false;
  }
  return true;
}

export const SUPPORTED_CITIES = [
  'Ahmedabad',
  'Bangalore',
  'Chandigarh',
  'Chennai',
  'Delhi',
  'Hyderabad',
  'Jaipur',
  'Kolkata',
  'Mumbai',
  'Pune',
];

export const CITY_LOCATIONS = {
  Ahmedabad: ['Satellite', 'Bodakdev', 'Bopal', 'Ambawadi', 'Paldi', 'Memnagar', 'Nava Vadaj', 'Sabarmati', 'Maninagar', 'Vastrapur'],
  Bangalore: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'BTM Layout', 'Jayanagar', 'Hebbal', 'Basavanagudi', 'Electronics City', 'Malleshwaram'],
  Chandigarh: ['Sector 17', 'Sector 20', 'Sector 22', 'Sector 34', 'Sector 35', 'Manimajra', 'Industrial Area Phase 1', 'Sector 43'],
  Chennai: ['Anna Nagar', 'T Nagar', 'Adyar', 'Velachery', 'Mylapore', 'Kilpauk', 'Chromepet', 'Guindy', 'Alwarpet', 'Nungambakkam'],
  Delhi: ['Saket', 'Connaught Place', 'South Extension', 'Dwarka', 'Vasant Kunj', 'Karol Bagh', 'Hauz Khas', 'Rohini', 'Greater Kailash', 'Janakpuri'],
  Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City', 'Madhapur', 'Kondapur', 'Secunderabad', 'Ameerpet', 'Kukatpally', 'Begumpet'],
  Jaipur: ['C Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'Tonk Road', 'Raja Park', 'Jagatpura', 'Bapu Nagar'],
  Kolkata: ['Park Street', 'Salt Lake', 'New Town', 'Ballygunge', 'Bhawanipore', 'Alipore', 'Jadavpur', 'Behala', 'Gariahat', 'Dum Dum'],
  Mumbai: ['Bandra West', 'Andheri West', 'Andheri East', 'Powai', 'Juhu', 'Worli', 'Colaba', 'Borivali West', 'Dadar', 'Goregaon'],
  Pune: ['Koregaon Park', 'Kothrud', 'Viman Nagar', 'Baner', 'Aundh', 'Hinjewadi', 'Hadapsar', 'Wakad', 'Shivajinagar', 'Kalyani Nagar'],
};

export function getLocationsForCity(cityName) {
  if (!cityName) return CITY_LOCATIONS.Delhi;
  const match = Object.keys(CITY_LOCATIONS).find(
    (k) => k.toLowerCase() === String(cityName).toLowerCase().trim()
  );
  return match ? CITY_LOCATIONS[match] : ['City Center', 'Central Area', 'Main Road'];
}

export function getCustomSpecialties() {
  try {
    const raw = localStorage.getItem('hn_custom_specialties');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomSpecialty(spec) {
  try {
    const clean = String(spec || '').trim();
    if (!clean) return;
    const current = getCustomSpecialties();
    if (!current.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      const updated = [...current, clean];
      localStorage.setItem('hn_custom_specialties', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hn_specialties_updated', { detail: clean }));
      }
    }
  } catch {}
}

export function getDeletedDoctorIds() {
  try {
    const raw = localStorage.getItem('hn_deleted_doctor_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDeletedHospitalIds() {
  try {
    const raw = localStorage.getItem('hn_deleted_hospital_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isDoctorDeleted(doc) {
  if (!doc) return true;
  const name = String(doc.doctor_name || doc.name || '').toLowerCase().trim();
  const id = String(doc.doctor_id || '').toLowerCase().trim();
  if (name.includes('akarsha agarwal') || (name.includes('akarsha') && name.includes('agarwal'))) {
    return true;
  }
  const deleted = getDeletedDoctorIds();
  const cleanName = name.replace(/^dr\.?\s*/i, '').trim();
  return deleted.includes(id) || deleted.includes(cleanName) || deleted.includes(name);
}

export function isHospitalDeleted(hosp) {
  if (!hosp) return true;
  const name = String(hosp.hospital_name || hosp.name || '').toLowerCase().trim();
  const id = String(hosp.hospital_id || '').toLowerCase().trim();
  const deleted = getDeletedHospitalIds();
  return deleted.includes(id) || deleted.includes(name);
}

export async function deleteDoctor(doctorId, doctorName = '') {
  try {
    const deleted = getDeletedDoctorIds();
    const idStr = String(doctorId || '').toLowerCase().trim();
    const nameStr = String(doctorName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();

    const updatedDeleted = Array.from(new Set([...deleted, idStr, nameStr].filter(Boolean)));
    localStorage.setItem('hn_deleted_doctor_ids', JSON.stringify(updatedDeleted));

    // Remove from hn_custom_doctors
    const customDocs = getCustomDoctors();
    const remainingDocs = customDocs.filter(
      (d) =>
        String(d.doctor_id).toLowerCase() !== idStr &&
        String(d.doctor_name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim() !== nameStr &&
        !isDoctorDeleted(d)
    );
    localStorage.setItem('hn_custom_doctors', JSON.stringify(remainingDocs));

    // Remove from hn_registered_users
    try {
      const rawUsers = localStorage.getItem('hn_registered_users');
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        if (Array.isArray(users)) {
          const filtered = users.filter((u) => {
            const uName = String(u.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
            const uId = String(u.id || '').toLowerCase();
            return uId !== idStr && uName !== nameStr && !isDoctorDeleted(u);
          });
          localStorage.setItem('hn_registered_users', JSON.stringify(filtered));
        }
      }
    } catch {}

    doctorsCache = null;

    // Call backend API DELETE
    try {
      await fetch(`${API_BASE_URL}/api/doctors/${encodeURIComponent(doctorId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.info('Backend doctor delete endpoint unavailable, removed locally.');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hn_doctors_updated', { detail: { removedId: doctorId } }));
    }

    return true;
  } catch (err) {
    console.warn('Failed to delete doctor:', err);
    return false;
  }
}

export async function deleteHospital(hospitalId, hospitalName = '') {
  try {
    const deleted = getDeletedHospitalIds();
    const idStr = String(hospitalId || '').toLowerCase().trim();
    const nameStr = String(hospitalName || '').toLowerCase().trim();

    const updatedDeleted = Array.from(new Set([...deleted, idStr, nameStr].filter(Boolean)));
    localStorage.setItem('hn_deleted_hospital_ids', JSON.stringify(updatedDeleted));

    // Remove from hn_custom_hospitals
    const customHosps = getCustomHospitals();
    const remainingHosps = customHosps.filter(
      (h) =>
        String(h.hospital_id).toLowerCase() !== idStr &&
        String(h.hospital_name || '').toLowerCase().trim() !== nameStr &&
        !isHospitalDeleted(h)
    );
    localStorage.setItem('hn_custom_hospitals', JSON.stringify(remainingHosps));

    hospitalsCache = null;

    // Call backend API DELETE
    try {
      await fetch(`${API_BASE_URL}/api/hospitals/${encodeURIComponent(hospitalId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.info('Backend hospital delete endpoint unavailable, removed locally.');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hn_hospitals_updated', { detail: { removedId: hospitalId } }));
    }

    return true;
  } catch (err) {
    console.warn('Failed to delete hospital:', err);
    return false;
  }
}

export function getCustomDoctors() {
  const list = [];
  const seenIds = new Set();

  try {
    const raw = localStorage.getItem('hn_custom_doctors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((d) => {
          if (d && d.doctor_id && !seenIds.has(String(d.doctor_id)) && !isDoctorDeleted(d)) {
            seenIds.add(String(d.doctor_id));
            list.push(d);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom doctors:', err);
  }

  // Scrub any legacy entries matching Akarsha Agarwal or deleted doctors
  try {
    const raw = localStorage.getItem('hn_custom_doctors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((d) => !isDoctorDeleted(d));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('hn_custom_doctors', JSON.stringify(cleaned));
        }
      }
    }
  } catch {}

  try {
    const rawUsers = localStorage.getItem('hn_registered_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        const cleaned = users.filter((u) => !isDoctorDeleted(u));
        if (cleaned.length !== users.length) {
          localStorage.setItem('hn_registered_users', JSON.stringify(cleaned));
        }
      }
    }
  } catch {}

  return list;
}

export function getCustomHospitals() {
  const list = [];
  const seenIds = new Set();

  try {
    const raw = localStorage.getItem('hn_custom_hospitals');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((h) => {
          if (h && (h.hospital_id || h.hospital_name) && !seenIds.has(String(h.hospital_id || h.hospital_name))) {
            seenIds.add(String(h.hospital_id || h.hospital_name));
            list.push(h);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom hospitals:', err);
  }

  return list;
}

export async function saveCustomHospital(hosp) {
  try {
    const current = getCustomHospitals();
    const cleanName = (hosp.hospital_name || hosp.name || '').trim();
    const rawCity = (hosp.city || 'Delhi').trim();
    const cleanCity = SUPPORTED_CITIES.find((c) => c.toLowerCase() === rawCity.toLowerCase()) || rawCity;
    const cleanLoc = (hosp.location || hosp.city || 'City Center').trim();
    let hospId = hosp.hospital_id || `hosp-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    // Try backend persistence
    try {
      const res = await fetch(`${API_BASE_URL}/api/hospitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_name: cleanName,
          city: cleanCity,
          location: cleanLoc,
          address: hosp.address || `${cleanName}, ${cleanLoc}, ${cleanCity}`,
          phone: hosp.phone || '+91 11 2651 5050',
          emergency_phone: hosp.emergency_phone || hosp.emergencyPhone || '+91 11 2651 5055',
          type: hosp.type || 'Multi Speciality Hospital',
          bed_count: hosp.bed_count ? Number(hosp.bed_count) : 150,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.hospital_id) {
          hospId = data.hospital_id;
        }
      }
    } catch (err) {
      console.info('Backend hospital creation unavailable, saved in local persistent database.');
    }

    const formatted = {
      hospital_id: hospId,
      hospital_name: cleanName,
      city: cleanCity,
      location: cleanLoc,
      address: hosp.address || `${cleanName}, ${cleanLoc}, ${cleanCity}`,
      phone: hosp.phone || '+91 11 2651 5050',
      emergency_phone: hosp.emergency_phone || hosp.emergencyPhone || '+91 11 2651 5055',
      type: hosp.type || 'Multi Speciality Hospital',
      doctor_count: hosp.doctor_count || 0,
      bed_count: hosp.bed_count ? Number(hosp.bed_count) : 150,
      isCustom: true,
    };

    const filtered = current.filter(
      (h) => String(h.hospital_id) !== String(hospId) && h.hospital_name?.toLowerCase() !== cleanName.toLowerCase()
    );
    const updated = [formatted, ...filtered];
    localStorage.setItem('hn_custom_hospitals', JSON.stringify(updated));

    hospitalsCache = null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hn_hospitals_updated', { detail: formatted }));
    }

    return formatted;
  } catch (err) {
    console.warn('Failed to save custom hospital:', err);
    return hosp;
  }
}

export async function saveCustomDoctor(doc) {
  try {
    const current = getCustomDoctors();
    const rawName = (doc.doctor_name || doc.name || '').trim();
    const docName = rawName.toLowerCase().startsWith('dr.') || rawName.toLowerCase().startsWith('dr ')
      ? rawName
      : `Dr. ${rawName}`;
    const cleanSpec = (doc.doctor_type || doc.specialization || 'General Medicine').trim();
    saveCustomSpecialty(cleanSpec);
    const rawCity = (doc.city || doc.location || 'Delhi').trim();
    const cleanCity = SUPPORTED_CITIES.find((c) => c.toLowerCase() === rawCity.toLowerCase()) || rawCity;
    const cleanLoc = (doc.location || doc.city || 'City Center').trim();
    const cleanHosp = (doc.hospital_name || doc.hospital || 'Metro Care Super Specialty Clinic').trim();
    const docFee = doc.fees != null ? Number(doc.fees) : doc.fee != null ? Number(doc.fee) : 800;
    const docExp = doc.experience_years != null ? Number(doc.experience_years) : doc.experienceYears != null ? Number(doc.experienceYears) : 10;
    const docPhone = doc.phone || '+91 98765 43210';
    const docEmail = doc.email || `doctor_${Date.now()}@healthnavigator.ai`;
    let docId = doc.doctor_id || `doc-${Date.now()}`;
    let hospId = doc.hospital_id || doc.hospitalId || `hosp-${cleanHosp.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // 1. Try backend POST
    try {
      const res = await fetch(`${API_BASE_URL}/api/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_name: docName,
          doctor_type: cleanSpec,
          experience_years: docExp,
          fees: docFee,
          city: cleanCity,
          location: cleanLoc,
          hospital_name: cleanHosp,
          hospital_id: typeof hospId === 'number' ? hospId : null,
          phone: docPhone,
          email: docEmail,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.doctor_id) {
          docId = data.doctor_id;
          if (data.hospital_id) hospId = data.hospital_id;
        }
      }
    } catch (err) {
      console.info('Backend doctor creation unavailable, saved in local persistent database.');
    }

    const formatted = {
      doctor_id: docId,
      composite_doctor_id: doc.composite_doctor_id || `${docName.toLowerCase()}_${cleanSpec.toLowerCase()}_${cleanLoc.toLowerCase()}`,
      doctor_name: docName,
      doctor_type: cleanSpec,
      specialization: cleanSpec,
      experience_years: docExp,
      fees: docFee,
      city: cleanCity,
      location: cleanLoc,
      hospital_id: hospId,
      hospital_name: cleanHosp,
      phone: docPhone,
      email: docEmail,
      rating: doc.rating || 4.9,
      reviews: doc.reviews || 36,
      availableToday: true,
      isRegistered: true,
    };

    const filtered = current.filter((d) => String(d.doctor_id) !== String(docId) && (!docEmail || d.email !== docEmail));
    const updated = [formatted, ...filtered];
    localStorage.setItem('hn_custom_doctors', JSON.stringify(updated));

    // Also register this hospital in custom hospitals
    saveCustomHospital({
      hospital_id: hospId,
      hospital_name: cleanHosp,
      city: cleanCity,
      location: cleanLoc,
      address: `${cleanHosp}, ${cleanLoc}, ${cleanCity}`,
      phone: docPhone,
    }).catch(() => {});

    doctorsCache = null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hn_doctors_updated', { detail: formatted }));
    }

    return formatted;
  } catch (err) {
    console.warn('Failed to save custom doctor:', err);
    return doc;
  }
}

export async function getDoctors(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.append('city', filters.city);
  if (filters.specialization) params.append('specialization', filters.specialization);
  if (filters.search) params.append('search', filters.search);

  const isDefault = params.toString() === '';

  let apiDoctors = [];
  try {
    if (isDefault && doctorsCache) {
      apiDoctors = doctorsCache.doctors || [];
      fetchData(`${API_BASE_URL}/api/doctors`)
        .then((data) => {
          if (data && data.doctors) doctorsCache = data;
        })
        .catch(() => {});
    } else {
      const data = await fetchData(`${API_BASE_URL}/api/doctors?${params.toString()}`);
      apiDoctors = data.doctors || [];
      if (isDefault) doctorsCache = data;
    }
  } catch (err) {
    console.info('Backend doctors fetch degraded, using baseline verified directory:', err.message);
  }

  // Prepend verified testing doctor Dr. Ananya Rao if it matches filters
  const merged = [];
  const seenIds = new Set();

  if (doctorMatchesFilter(VERIFIED_TESTING_DOCTOR, filters) && !isDoctorDeleted(VERIFIED_TESTING_DOCTOR)) {
    merged.push(VERIFIED_TESTING_DOCTOR);
    seenIds.add(String(VERIFIED_TESTING_DOCTOR.doctor_id));
  }

  // Prepend any newly registered / custom doctors
  const customDocs = getCustomDoctors();
  customDocs.forEach((doc) => {
    if (!seenIds.has(String(doc.doctor_id)) && doctorMatchesFilter(doc, filters) && !isDoctorDeleted(doc)) {
      merged.push(doc);
      seenIds.add(String(doc.doctor_id));
    }
  });

  apiDoctors.forEach((doc) => {
    if (
      !seenIds.has(String(doc.doctor_id)) &&
      !String(doc.doctor_name || '').toLowerCase().includes('ananya rao') &&
      !isDoctorDeleted(doc)
    ) {
      merged.push(doc);
      seenIds.add(String(doc.doctor_id));
    }
  });

  return {
    total: merged.length,
    doctors: merged,
  };
}

export async function getHospitals(filters = {}) {
  const params = new URLSearchParams();

  if (filters.city) params.append('city', filters.city);
  if (filters.search) params.append('search', filters.search);

  const isDefault = params.toString() === '';

  let apiHospitals = [];
  try {
    if (isDefault && hospitalsCache) {
      apiHospitals = hospitalsCache.hospitals || [];
      fetchData(`${API_BASE_URL}/api/hospitals`)
        .then((data) => {
          if (data && data.hospitals) hospitalsCache = data;
        })
        .catch(() => {});
    } else {
      const data = await fetchData(`${API_BASE_URL}/api/hospitals?${params.toString()}`);
      apiHospitals = data.hospitals || [];
      if (isDefault) hospitalsCache = data;
    }
  } catch (err) {
    console.info('Backend hospitals fetch degraded, using baseline verified directory:', err.message);
  }

  // Prepend verified testing hospital if matches filter
  const merged = [];
  const seenHospIds = new Set();

  if (hospitalMatchesFilter(VERIFIED_TESTING_HOSPITAL, filters) && !isHospitalDeleted(VERIFIED_TESTING_HOSPITAL)) {
    merged.push(VERIFIED_TESTING_HOSPITAL);
    seenHospIds.add(String(VERIFIED_TESTING_HOSPITAL.hospital_id));
  }

  // Add custom registered hospitals
  const customHosps = getCustomHospitals();
  customHosps.forEach((hosp) => {
    if (!seenHospIds.has(String(hosp.hospital_id)) && hospitalMatchesFilter(hosp, filters) && !isHospitalDeleted(hosp)) {
      merged.push(hosp);
      seenHospIds.add(String(hosp.hospital_id));
    }
  });

  // Add hospitals from custom registered doctors
  const customDocs = getCustomDoctors();
  customDocs.forEach((doc) => {
    if (doc.hospital_id && doc.hospital_name && !seenHospIds.has(String(doc.hospital_id))) {
      const customHosp = {
        hospital_id: doc.hospital_id,
        hospital_name: doc.hospital_name,
        city: doc.city || 'Delhi',
        location: doc.location || doc.city || 'City Center',
        address: `${doc.hospital_name}, ${doc.city || 'Delhi'}`,
        phone: doc.phone || '+91 98765 43210',
      };
      if (hospitalMatchesFilter(customHosp, filters) && !isHospitalDeleted(customHosp)) {
        merged.push(customHosp);
        seenHospIds.add(String(doc.hospital_id));
      }
    }
  });

  apiHospitals.forEach((hosp) => {
    if (
      !seenHospIds.has(String(hosp.hospital_id)) &&
      !String(hosp.hospital_name || '').toLowerCase().includes('sunrise chest') &&
      !isHospitalDeleted(hosp)
    ) {
      merged.push(hosp);
      seenHospIds.add(String(hosp.hospital_id));
    }
  });

  return {
    total: merged.length,
    hospitals: merged,
  };
}

export async function getHospitalDoctors(hospitalId) {
  return fetchData(
    `${API_BASE_URL}/api/hospitals/${hospitalId}/doctors`
  );
}
