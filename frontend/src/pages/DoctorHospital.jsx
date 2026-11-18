
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarPlus,
  Clock,
  History,
  IndianRupee,
  MapPin,
  Search,
  SearchX,
  UserPlus,
  UserRound,
  BriefcaseMedical,
  X,
  Trash2,
} from 'lucide-react';

import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  getDoctors,
  getHospitals,
  saveCustomDoctor,
  saveCustomHospital,
  deleteDoctor,
  deleteHospital,
} from '../services/healthcareService';
import {
  clearAllSearchHistory,
  loadSearchHistory,
  removeSearchItem,
  saveSearchItem,
} from '../utils/searchHistory';

const initials = (name = '') =>
  name
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const has = (text, q) =>
  String(text || '').toLowerCase().includes(q.toLowerCase());

export default function DoctorHospital() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [tab, setTab] = useState('all');
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    setRecentHistory(loadSearchHistory(user?.id));
  }, [user?.id]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const textToSave = query.trim() || location.trim();
    if (textToSave) {
      const updated = saveSearchItem(user?.id, textToSave, '/doctor-hospital');
      if (updated) setRecentHistory(updated);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e);
    }
  };

  const handleRecentChipClick = (chipQuery) => {
    setQuery(chipQuery);
    const updated = saveSearchItem(user?.id, chipQuery, '/doctor-hospital');
    if (updated) setRecentHistory(updated);
  };

  const handleSpecialtyClick = (s) => {
    setSpecialty(s);
    if (s !== 'All') {
      const updated = saveSearchItem(user?.id, s, '/doctor-hospital');
      if (updated) setRecentHistory(updated);
    }
  };

  const [doctorsData, setDoctorsData] = useState([]);
  const [hospitalsData, setHospitalsData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add doctor modal state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [addDocName, setAddDocName] = useState('');
  const [addDocSpec, setAddDocSpec] = useState('General Medicine');
  const [addDocExp, setAddDocExp] = useState('10');
  const [addDocHosp, setAddDocHosp] = useState('');
  const [addDocCity, setAddDocCity] = useState('');
  const [addDocLoc, setAddDocLoc] = useState('');
  const [addDocFee, setAddDocFee] = useState('800');
  const [addDocPhone, setAddDocPhone] = useState('+91 98765 43210');
  const [addDocEmail, setAddDocEmail] = useState('');
  const [addDocSubmitting, setAddDocSubmitting] = useState(false);
  const [addDocSuccess, setAddDocSuccess] = useState('');
  const [addDocError, setAddDocError] = useState('');

  // Add hospital modal state
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [addHospName, setAddHospName] = useState('');
  const [addHospType, setAddHospType] = useState('Multi Speciality Hospital');
  const [addHospCity, setAddHospCity] = useState('');
  const [addHospLoc, setAddHospLoc] = useState('');
  const [addHospAddress, setAddHospAddress] = useState('');
  const [addHospPhone, setAddHospPhone] = useState('+91 11 2651 5050');
  const [addHospEmergency, setAddHospEmergency] = useState('+91 11 2651 5055');
  const [addHospBeds, setAddHospBeds] = useState('150');
  const [addHospSubmitting, setAddHospSubmitting] = useState(false);
  const [addHospSuccess, setAddHospSuccess] = useState('');
  const [addHospError, setAddHospError] = useState('');

  // Remove doctor & hospital feedback
  const [actionNotice, setActionNotice] = useState('');

  const handleRemoveDoctor = async (doc) => {
    const docName = doc.doctor_name || 'this doctor';
    const confirmed = window.confirm(`Are you sure you want to remove ${docName} from the database?`);
    if (!confirmed) return;

    try {
      await deleteDoctor(doc.doctor_id, doc.doctor_name);
      setDoctorsData((prev) =>
        prev.filter(
          (d) =>
            String(d.doctor_id) !== String(doc.doctor_id) &&
            d.doctor_name !== doc.doctor_name
        )
      );
      setActionNotice(`${docName} was successfully removed.`);
      setTimeout(() => setActionNotice(''), 4500);
    } catch (err) {
      alert(`Could not remove doctor: ${err.message || err}`);
    }
  };

  const handleRemoveHospital = async (hosp) => {
    const hospName = hosp.hospital_name || 'this hospital';
    const confirmed = window.confirm(`Are you sure you want to remove ${hospName} from the database?`);
    if (!confirmed) return;

    try {
      await deleteHospital(hosp.hospital_id, hosp.hospital_name);
      setHospitalsData((prev) =>
        prev.filter(
          (h) =>
            String(h.hospital_id) !== String(hosp.hospital_id) &&
            h.hospital_name !== hosp.hospital_name
        )
      );
      setActionNotice(`${hospName} was successfully removed.`);
      setTimeout(() => setActionNotice(''), 4500);
    } catch (err) {
      alert(`Could not remove hospital: ${err.message || err}`);
    }
  };

  // Fetch actual doctors and hospitals from FastAPI & persistent registry
  useEffect(() => {
    let active = true;

    async function loadHealthcareData() {
      try {
        setLoading(true);
        setError('');

        const [doctorResponse, hospitalResponse] = await Promise.all([
          getDoctors(),
          getHospitals()
        ]);

        if (!active) return;

        setDoctorsData(doctorResponse.doctors || []);
        setHospitalsData(hospitalResponse.hospitals || []);
      } catch (err) {
        if (active) {
          setError(
            err.message || 'Unable to load doctors and hospitals.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHealthcareData();

    const handleUpdate = () => {
      loadHealthcareData();
    };
    window.addEventListener('hn_doctors_updated', handleUpdate);
    window.addEventListener('hn_hospitals_updated', handleUpdate);

    return () => {
      active = false;
      window.removeEventListener('hn_doctors_updated', handleUpdate);
      window.removeEventListener('hn_hospitals_updated', handleUpdate);
    };
  }, []);

  // Generate specialties from actual doctor records
  const specialties = useMemo(() => {
    const values = doctorsData
      .map((d) => d.doctor_type)
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [doctorsData]);

  const queryTokens = useMemo(() => {
    if (!query.trim()) return [];
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w && !['in', 'at', 'near', 'and', 'the', 'of', 'for'].includes(w));
  }, [query]);

  // Filter actual doctors
  const doctors = useMemo(
    () =>
      doctorsData.filter((d) => {
        let matchesQuery = true;
        if (queryTokens.length > 0) {
          const docText = `${d.doctor_name || ''} ${d.doctor_type || ''} ${d.specialization || ''} ${d.hospital_name || ''} ${d.city || ''} ${d.location || ''}`.toLowerCase();
          matchesQuery = queryTokens.every((t) => docText.includes(t));
        }

        const matchesLocation =
          !location ||
          has(d.city, location) ||
          has(d.location, location);

        const matchesSpecialty =
          specialty === 'All' ||
          d.doctor_type === specialty ||
          d.specialization === specialty;

        return (
          matchesQuery &&
          matchesLocation &&
          matchesSpecialty
        );
      }),
    [doctorsData, queryTokens, location, specialty]
  );

  // Filter actual hospitals
  const hospitals = useMemo(
    () =>
      hospitalsData.filter((h) => {
        let matchesQuery = true;
        if (queryTokens.length > 0) {
          const hospText = `${h.hospital_name || ''} ${h.city || ''} ${h.location || ''}`.toLowerCase();
          matchesQuery = queryTokens.every((t) => hospText.includes(t));
        }

        const matchesLocation =
          !location ||
          has(h.city, location);

        const matchesSpecialty =
          specialty === 'All' ||
          doctorsData.some(
            (d) =>
              (d.hospital_name === h.hospital_name || d.hospital_id === h.hospital_id) &&
              (d.doctor_type === specialty || d.specialization === specialty)
          );

        return (
          matchesQuery &&
          matchesLocation &&
          matchesSpecialty
        );
      }),
    [hospitalsData, doctorsData, queryTokens, location, specialty]
  );

  const showDoctors = tab !== 'hospitals';
  const showHospitals = tab !== 'doctors';

  const nothing =
    (!showDoctors || doctors.length === 0) &&
    (!showHospitals || hospitals.length === 0);

  const reset = () => {
    setQuery('');
    setLocation('');
    setSpecialty('All');
  };

  return (
    <div className="page">
      <PageHeader
        title="Doctor & Hospital"
        description="Search verified clinicians and hospital networks across Indian cities."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setAddDocError('');
                setAddDocSuccess('');
                setShowAddDoctorModal(true);
              }}
            >
              <UserPlus size={16} /> Add Doctor
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setAddHospError('');
                setAddHospSuccess('');
                setShowAddHospitalModal(true);
              }}
            >
              <Building2 size={16} /> Add Hospital
            </button>
          </div>
        }
      />

      {actionNotice && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#15803d',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.92rem',
            fontWeight: 500,
          }}
        >
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              display: 'flex',
              padding: '2px',
            }}
            aria-label="Dismiss notice"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="panel search-panel" aria-label="Search">

        <div className="search-panel__fields">
          <label className="field field--icon">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Doctor or hospital name"
              aria-label="Search doctors and hospitals"
            />
          </label>

          <label className="field field--icon">
            <MapPin size={18} aria-hidden="true" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="City, e.g. Delhi"
              aria-label="Location"
            />
          </label>

          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSearchSubmit}
            style={{ padding: '0 1.25rem', whiteSpace: 'nowrap' }}
          >
            <Search size={16} /> Search
          </button>
        </div>

        {recentHistory.length > 0 && (
          <div className="search-history-chips">
            <span className="search-history-chips__label">
              <History size={13} /> Recent Searches:
            </span>
            {recentHistory.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className="search-history-chip"
                onClick={() => handleRecentChipClick(item.query)}
              >
                <Clock size={11} style={{ opacity: 0.7 }} />
                <span>{item.query}</span>
                <span
                  className="search-history-chip__del"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = removeSearchItem(user?.id, item.query);
                    setRecentHistory(updated);
                  }}
                  title="Remove from history"
                >
                  <X size={11} />
                </span>
              </button>
            ))}
            <button
              type="button"
              className="search-history-chips__clear"
              onClick={() => {
                const updated = clearAllSearchHistory(user?.id);
                setRecentHistory(updated);
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div className="chip-row" role="group" aria-label="Specialty">
          {['All', ...specialties].map((s) => (
            <button
              key={s}
              className={`chip chip--btn ${
                specialty === s ? 'is-active' : ''
              }`}
              onClick={() => handleSpecialtyClick(s)}
              aria-pressed={specialty === s}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="search-panel__bar">
          <div className="segmented" role="tablist" aria-label="Result type">
            {[
              ['all', 'All'],
              ['doctors', 'Doctors'],
              ['hospitals', 'Hospitals']
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'is-active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading && (
  <div className="section">
    <div className="section__head">
      <h2>Loading healthcare results...</h2>
    </div>

    <div className="card-grid">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <article className="result-card skeleton-card" key={item}>
          <div className="result-card__top">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
            </div>
          </div>

          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-button" />
        </article>
      ))}
    </div>
  </div>
)}

      {!loading && error && (
        <div className="empty">
          <SearchX size={30} aria-hidden="true" />
          <h3>Unable to load data</h3>
          <p>{error}</p>
          <button
            className="btn btn--ghost"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && nothing && (
        <div className="empty">
          <SearchX size={30} aria-hidden="true" />
          <h3>No matches</h3>
          <p>
            Try a different city or specialty, or clear the filters.
          </p>
          <button className="btn btn--ghost" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && showDoctors && doctors.length > 0 && (
        <section className="section" aria-labelledby="doc-h">
          <div className="section__head">
            <h2 id="doc-h">
              Doctors <span className="count">{doctors.length}</span>
            </h2>
          </div>

          <div className="card-grid">
            {doctors.map((d) => (
              <article key={d.doctor_id} className="result-card">

                <div className="result-card__top">
                  <span className="avatar" aria-hidden="true">
                    {initials(d.doctor_name)}
                  </span>

                  <div>
                    <h3>{d.doctor_name}</h3>
                    <p>
                      {d.doctor_type || 'Specialization not available'}
                      {' · '}
                      {d.experience_years} years experience
                    </p>
                  </div>
                </div>

                <ul className="meta">
                  <li>
                    <Building2 size={15} aria-hidden="true" />
                    {d.hospital_name || 'Hospital not available'}
                  </li>

                  <li>
                    <MapPin size={15} aria-hidden="true" />
                    {d.location}, {d.city}
                  </li>

                  <li>
                    <IndianRupee size={15} aria-hidden="true" />
                    {d.fees != null
                      ? `${d.fees} consultation fee`
                      : 'Consultation fee not available'}
                  </li>
                </ul>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ flex: 1 }}
                    onClick={() =>
                      navigate('/appointments', {
                        state: {
                          doctorId: d.doctor_id,
                          doctorName: d.doctor_name,
                          specialization: d.doctor_type || d.specialization,
                          hospitalId: d.hospital_id,
                          hospitalName: d.hospital_name,
                          city: d.city,
                          fees: d.fees,
                        },
                      })
                    }
                  >
                    <CalendarPlus size={16} />
                    Book appointment
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{
                      color: '#dc2626',
                      borderColor: 'rgba(220, 38, 38, 0.28)',
                      padding: '0 0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    onClick={() => handleRemoveDoctor(d)}
                    title={`Remove ${d.doctor_name}`}
                  >
                    <Trash2 size={15} />
                    <span>Remove</span>
                  </button>
                </div>

              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && showHospitals && hospitals.length > 0 && (
        <section className="section" aria-labelledby="hos-h">
          <div className="section__head">
            <h2 id="hos-h">
              Hospitals <span className="count">{hospitals.length}</span>
            </h2>
          </div>

          <div className="card-grid">
            {hospitals.map((h) => (
              <article
                key={h.hospital_id}
                className="result-card result-card--hospital"
              >

                <div className="result-card__top">
                  <span
                    className="avatar avatar--square"
                    aria-hidden="true"
                  >
                    <Building2 size={20} />
                  </span>

                  <div>
                    <h3>{h.hospital_name}</h3>
                    <p>{h.city}</p>
                  </div>
                </div>

                <ul className="meta">
                  <li>
                    <UserRound size={15} aria-hidden="true" />
                    {h.doctor_count} associated doctors
                  </li>

                  <li>
                    <MapPin size={15} aria-hidden="true" />
                    {h.city}
                  </li>
                </ul>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ flex: 1 }}
                    onClick={() =>
                      navigate('/appointments', {
                        state: {
                          hospitalId: h.hospital_id,
                          hospitalName: h.hospital_name,
                          city: h.city,
                        }
                      })
                    }
                  >
                    <BriefcaseMedical size={16} />
                    Book at this hospital
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{
                      color: '#dc2626',
                      borderColor: 'rgba(220, 38, 38, 0.28)',
                      padding: '0 0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    onClick={() => handleRemoveHospital(h)}
                    title={`Remove ${h.hospital_name}`}
                  >
                    <Trash2 size={15} />
                    <span>Remove</span>
                  </button>
                </div>

              </article>
            ))}
          </div>
        </section>
      )}

      {/* ADD DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div className="dr-overlay" role="dialog" aria-modal="true">
          <div className="dr-modal dr-modal--wide">
            <div className="dr-modal__head">
              <div>
                <h2>Add Verified Clinician to Database</h2>
                <p>All fields are required to register a doctor in the healthcare provider directory.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddDoctorModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddDocError('');
                if (
                  !addDocName.trim() ||
                  !addDocSpec.trim() ||
                  !addDocExp ||
                  !addDocFee ||
                  !addDocHosp.trim() ||
                  !addDocCity.trim() ||
                  !addDocLoc.trim() ||
                  !addDocPhone.trim() ||
                  !addDocEmail.trim()
                ) {
                  setAddDocError('All fields are strictly required to create a new doctor.');
                  return;
                }

                setAddDocSubmitting(true);
                try {
                  const saved = await saveCustomDoctor({
                    name: addDocName.trim(),
                    specialization: addDocSpec.trim(),
                    experience_years: Number(addDocExp) || 1,
                    fees: Number(addDocFee) || 500,
                    hospital: addDocHosp.trim(),
                    city: addDocCity.trim(),
                    location: addDocLoc.trim(),
                    phone: addDocPhone.trim(),
                    email: addDocEmail.trim(),
                  });

                  setAddDocSuccess(`Dr. ${saved.doctor_name || addDocName} has been successfully added to the database!`);
                  setTimeout(() => {
                    setAddDocSuccess('');
                    setShowAddDoctorModal(false);
                    setAddDocName('');
                    setAddDocSpec('General Medicine');
                    setAddDocExp('10');
                    setAddDocHosp('');
                    setAddDocCity('');
                    setAddDocLoc('');
                    setAddDocFee('800');
                    setAddDocPhone('+91 98765 43210');
                    setAddDocEmail('');
                  }, 1200);
                } catch (err) {
                  setAddDocError(err.message || 'Failed to save doctor.');
                } finally {
                  setAddDocSubmitting(false);
                }
              }}
            >
              <div className="dr-modal__body">
                {addDocSuccess && (
                  <p style={{ color: '#047857', fontWeight: 600, padding: '0.65rem 0.85rem', background: '#ecfdf5', borderRadius: 'var(--r-md)', border: '1px solid #a7f3d0', marginBottom: '1rem' }}>
                    ✓ {addDocSuccess}
                  </p>
                )}

                {addDocError && (
                  <p style={{ color: '#b91c1c', fontWeight: 600, padding: '0.65rem 0.85rem', background: '#fef2f2', borderRadius: 'var(--r-md)', border: '1px solid #fecaca', marginBottom: '1rem' }}>
                    ⚠ {addDocError}
                  </p>
                )}

                <div className="dr-form-grid">
                  <label className="stack">
                    <span className="label">Doctor Full Name <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Dr. Rajesh Verma"
                      value={addDocName}
                      onChange={(e) => setAddDocName(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Specialization / Department <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      list="doc-specialties-list"
                      placeholder="e.g. Cardiology"
                      value={addDocSpec}
                      onChange={(e) => setAddDocSpec(e.target.value)}
                    />
                    <datalist id="doc-specialties-list">
                      <option value="General Medicine" />
                      <option value="Cardiology" />
                      <option value="Pulmonology" />
                      <option value="Orthopedics" />
                      <option value="Pediatrics" />
                      <option value="Dermatology" />
                      <option value="Neurology" />
                      <option value="Gynecology" />
                      <option value="General Surgery" />
                      <option value="Oncology" />
                      <option value="Ophthalmology" />
                      <option value="ENT" />
                      <option value="Psychiatry" />
                      <option value="Gastroenterology" />
                    </datalist>
                  </label>

                  <label className="stack">
                    <span className="label">Experience (Years) <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max="75"
                      required
                      placeholder="e.g. 14"
                      value={addDocExp}
                      onChange={(e) => setAddDocExp(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Consultation Fee (₹) <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 800"
                      value={addDocFee}
                      onChange={(e) => setAddDocFee(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Hospital / Clinic Name <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      list="doc-hospitals-list"
                      placeholder="e.g. Apollo Hospital"
                      value={addDocHosp}
                      onChange={(e) => setAddDocHosp(e.target.value)}
                    />
                    <datalist id="doc-hospitals-list">
                      {hospitalsData.map((h, i) => (
                        <option key={`${h.hospital_name}-${i}`} value={h.hospital_name} />
                      ))}
                    </datalist>
                  </label>

                  <label className="stack">
                    <span className="label">City <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      list="doc-cities-list"
                      placeholder="e.g. Delhi, Mumbai, Bangalore"
                      value={addDocCity}
                      onChange={(e) => setAddDocCity(e.target.value)}
                    />
                    <datalist id="doc-cities-list">
                      <option value="Delhi" />
                      <option value="Mumbai" />
                      <option value="Bangalore" />
                      <option value="Hyderabad" />
                      <option value="Chennai" />
                      <option value="Kolkata" />
                      <option value="Pune" />
                      <option value="Ahmedabad" />
                    </datalist>
                  </label>

                  <label className="stack">
                    <span className="label">Clinic Location / Area <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Connaught Place, Block B"
                      value={addDocLoc}
                      onChange={(e) => setAddDocLoc(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Contact Phone <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={addDocPhone}
                      onChange={(e) => setAddDocPhone(e.target.value)}
                    />
                  </label>

                  <label className="stack" style={{ gridColumn: 'span 2' }}>
                    <span className="label">Official Email Address <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="email"
                      required
                      placeholder="e.g. dr.verma@apollo.com"
                      value={addDocEmail}
                      onChange={(e) => setAddDocEmail(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="dr-modal__foot">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowAddDoctorModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={addDocSubmitting}
                >
                  {addDocSubmitting ? 'Registering...' : 'Add to Doctor Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD HOSPITAL MODAL */}
      {showAddHospitalModal && (
        <div className="dr-overlay" role="dialog" aria-modal="true">
          <div className="dr-modal dr-modal--wide">
            <div className="dr-modal__head">
              <div>
                <h2>Add New Hospital to Database</h2>
                <p>All fields are required to register a medical facility or hospital center.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddHospitalModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAddHospError('');
                if (
                  !addHospName.trim() ||
                  !addHospType.trim() ||
                  !addHospCity.trim() ||
                  !addHospLoc.trim() ||
                  !addHospAddress.trim() ||
                  !addHospPhone.trim() ||
                  !addHospEmergency.trim() ||
                  !addHospBeds
                ) {
                  setAddHospError('All fields are strictly required to create a new hospital.');
                  return;
                }

                setAddHospSubmitting(true);
                try {
                  const saved = await saveCustomHospital({
                    hospital_name: addHospName.trim(),
                    type: addHospType.trim(),
                    city: addHospCity.trim(),
                    location: addHospLoc.trim(),
                    address: addHospAddress.trim(),
                    phone: addHospPhone.trim(),
                    emergency_phone: addHospEmergency.trim(),
                    bed_count: Number(addHospBeds) || 100,
                  });

                  setAddHospSuccess(`${saved.hospital_name || addHospName} has been successfully registered in the hospital database!`);
                  setTimeout(() => {
                    setAddHospSuccess('');
                    setShowAddHospitalModal(false);
                    setAddHospName('');
                    setAddHospType('Multi Speciality Hospital');
                    setAddHospCity('');
                    setAddHospLoc('');
                    setAddHospAddress('');
                    setAddHospPhone('+91 11 2651 5050');
                    setAddHospEmergency('+91 11 2651 5055');
                    setAddHospBeds('150');
                  }, 1200);
                } catch (err) {
                  setAddHospError(err.message || 'Failed to save hospital.');
                } finally {
                  setAddHospSubmitting(false);
                }
              }}
            >
              <div className="dr-modal__body">
                {addHospSuccess && (
                  <p style={{ color: '#047857', fontWeight: 600, padding: '0.65rem 0.85rem', background: '#ecfdf5', borderRadius: 'var(--r-md)', border: '1px solid #a7f3d0', marginBottom: '1rem' }}>
                    ✓ {addHospSuccess}
                  </p>
                )}

                {addHospError && (
                  <p style={{ color: '#b91c1c', fontWeight: 600, padding: '0.65rem 0.85rem', background: '#fef2f2', borderRadius: 'var(--r-md)', border: '1px solid #fecaca', marginBottom: '1rem' }}>
                    ⚠ {addHospError}
                  </p>
                )}

                <div className="dr-form-grid">
                  <label className="stack">
                    <span className="label">Hospital / Clinic Name <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Max Super Speciality Hospital"
                      value={addHospName}
                      onChange={(e) => setAddHospName(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Facility Type <span style={{ color: '#dc2626' }}>*</span></span>
                    <select
                      className="field"
                      required
                      value={addHospType}
                      onChange={(e) => setAddHospType(e.target.value)}
                    >
                      <option value="Super Speciality Hospital">Super Speciality Hospital</option>
                      <option value="Multi Speciality Hospital">Multi Speciality Hospital</option>
                      <option value="General Hospital">General Hospital</option>
                      <option value="Specialist Clinic">Specialist Clinic</option>
                      <option value="Diagnostic & Medical Center">Diagnostic & Medical Center</option>
                    </select>
                  </label>

                  <label className="stack">
                    <span className="label">City <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      list="hosp-cities-list"
                      placeholder="e.g. Delhi, Mumbai, Bangalore"
                      value={addHospCity}
                      onChange={(e) => setAddHospCity(e.target.value)}
                    />
                    <datalist id="hosp-cities-list">
                      <option value="Delhi" />
                      <option value="Mumbai" />
                      <option value="Bangalore" />
                      <option value="Hyderabad" />
                      <option value="Chennai" />
                      <option value="Kolkata" />
                      <option value="Pune" />
                      <option value="Ahmedabad" />
                    </datalist>
                  </label>

                  <label className="stack">
                    <span className="label">Location / Area <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. Saket Institutional Area"
                      value={addHospLoc}
                      onChange={(e) => setAddHospLoc(e.target.value)}
                    />
                  </label>

                  <label className="stack" style={{ gridColumn: 'span 2' }}>
                    <span className="label">Full Physical Address <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      required
                      placeholder="e.g. 1, 2, Press Enclave Marg, Saket, New Delhi 110017"
                      value={addHospAddress}
                      onChange={(e) => setAddHospAddress(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Reception / OPD Phone <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="tel"
                      required
                      placeholder="e.g. +91 11 2651 5050"
                      value={addHospPhone}
                      onChange={(e) => setAddHospPhone(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Emergency / Ambulance Helpline <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="tel"
                      required
                      placeholder="e.g. +91 11 2651 5055"
                      value={addHospEmergency}
                      onChange={(e) => setAddHospEmergency(e.target.value)}
                    />
                  </label>

                  <label className="stack">
                    <span className="label">Total Bed Capacity <span style={{ color: '#dc2626' }}>*</span></span>
                    <input
                      className="field"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 250"
                      value={addHospBeds}
                      onChange={(e) => setAddHospBeds(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="dr-modal__foot">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowAddHospitalModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={addHospSubmitting}
                >
                  {addHospSubmitting ? 'Registering...' : 'Add to Hospital Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
