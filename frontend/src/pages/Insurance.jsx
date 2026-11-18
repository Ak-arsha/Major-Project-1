import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Check,
  CircleMinus,
  Minus,
  Send,
  Upload,
  FileText,
  ChevronDown,
  X,
  LoaderCircle,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import SampleBadge from "../components/common/SampleBadge";
import {
  CLAIM_STEPS,
  INSURANCE_SUGGESTIONS,
  POLICIES,
} from "../data/sampleData";
import {
  answerInsuranceQuestion,
  fetchAllInsuranceDocuments,
  fetchPolicyFinderPolicies,
  filterPolicyDataset,
  uploadInsurancePDF,
} from "../services/insuranceService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://healthcare-navigator-api-phi.vercel.app');

const STATUS_ICON = {
  Covered: Check,
  Limited: Minus,
  "Not covered": CircleMinus,
};

export default function Insurance() {
  const [policyId, setPolicyId] = useState(POLICIES[0].id);
  const [text, setText] = useState("");
  const [activeModule, setActiveModule] = useState("assistant");
  // Policy Finder states
  const [finderPolicies, setFinderPolicies] = useState([]);
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderError, setFinderError] = useState("");
  const [finderSearch, setFinderSearch] = useState("");
  const [finderCategory, setFinderCategory] = useState("all");
  // Policy Finder filters
  const [finderFilters, setFinderFilters] = useState({
    min_sum_insured: "",
    max_sum_insured: "",
    copay: "",
    deductible: "",
    initial_waiting: "",
    ped_waiting: "",
  });
  const [sortBy, setSortBy] = useState("relevance");

  const handleResetFilters = () => {
    setFinderFilters({
      min_sum_insured: "",
      max_sum_insured: "",
      copay: "",
      deductible: "",
      initial_waiting: "",
      ped_waiting: "",
    });
    setFinderSearch("");
    setFinderCategory("all");
    setSortBy("relevance");
  };

  const [filterOptions, setFilterOptions] = useState({});
  // Selected policy details
  const [selectedFinderPolicy, setSelectedFinderPolicy] = useState(null);
  const [policyDetails, setPolicyDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Backend documents
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  // Answer and messages
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const policy = POLICIES.find((p) => p.id === policyId);

  // Fetch health insurance policies for Policy Finder
  const fetchFinderPolicies = async () => {
    setFinderLoading(true);
    setFinderError("");

    try {
      const data = await fetchPolicyFinderPolicies({
        category: finderCategory,
        search: finderSearch,
        ...finderFilters,
      });

      setFinderPolicies(data.results || []);
      setFilterOptions(data.filter_options || {});
    } catch (err) {
      console.error("Policy Finder error:", err);
      setFinderError(err.message || "Failed to load policies.");
    } finally {
      setFinderLoading(false);
    }
  };
  const fetchPolicyDetails = async (uin) => {
    setDetailsLoading(true);
    setDetailsError("");
    setPolicyDetails(null);
    setSelectedFinderPolicy(uin);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/policy-finder/policies/${encodeURIComponent(uin)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load policy details.");
      }

      setPolicyDetails(data);
    } catch (err) {
      console.warn("Policy details API failed, using cached policy info:", err);
      const matched = finderPolicies.find(
        (p) => String(p.uin || '').toLowerCase() === String(uin || '').toLowerCase()
      );
      if (matched) {
        setPolicyDetails({
          ...matched,
          name: matched.name,
          insurer: matched.insurer,
          uin: matched.uin,
          category: matched.category,
          category_name: matched.category?.replaceAll("-", " "),
          description:
            matched.summary ||
            matched.description ||
            "Comprehensive health insurance policy covering in-patient hospitalization, emergency daycare treatments, and pre/post-hospitalization medical expenses.",
          key_benefits: matched.key_benefits || [
            "Cashless treatment across network hospitals nationwide",
            "In-patient hospitalization and ICU charges covered",
            "Pre and post hospitalization medical expense coverage (30/60 days)",
            "Emergency ambulance assistance cover",
          ],
          sum_insured_options: matched.sum_insured_options || [
            "₹3,00,000",
            "₹5,00,000",
            "₹10,00,000",
            "₹25,00,000",
          ],
          waiting_periods: matched.waiting_periods || {
            initial: matched.initial_waiting || "30 days",
            pre_existing_diseases: matched.ped_waiting || "36 months",
            specific_illnesses: "24 months",
          },
          copay: matched.copay || "None (0%)",
          room_rent_limit: matched.room_rent_limit || "No sub-limit / Standard private room",
        });
        setDetailsError("");
      } else {
        setDetailsError(err.message || "Unable to load policy details.");
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const closePolicyDetails = () => {
    setSelectedFinderPolicy(null);
    setPolicyDetails(null);
    setDetailsError("");
  };

  // Load uploaded documents and verified baseline policies
  const fetchDocuments = async () => {
    try {
      const docs = await fetchAllInsuranceDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocument) {
        setSelectedDocument(docs[0].filename);
      }
    } catch (err) {
      console.warn("Document loading error:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (activeModule === "finder" && finderPolicies.length === 0) {
      fetchFinderPolicies();
    }
  }, [activeModule]);

  // Upload PDF with backend and client-side extraction support
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a PDF file only.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError("");
    setUploadMessage("");
    setAnswer(null);

    try {
      const res = await uploadInsurancePDF(file);
      setUploadMessage(
        `✓ ${res.filename} uploaded and indexed successfully! (${res.total_pages} pages, ${res.total_chunks} policy clauses)`
      );
      await fetchDocuments();
      setSelectedDocument(res.filename);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Unable to upload and index PDF.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Ask policy assistant using selected insurance document
  const submit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (!selectedDocument) {
      setError("Please select an insurance document first.");
      return;
    }

    setAsking(true);
    setError("");
    setAnswer(null);

    try {
      const data = await answerInsuranceQuestion(text.trim(), selectedDocument);
      setAnswer(data);
    } catch (err) {
      console.error("Insurance question error:", err);
      setError(err.message || "Unable to analyze policy coverage for this query.");
    } finally {
      setAsking(false);
    }
  };

  const selectedDoc = documents.find(
    (doc) => doc.filename === selectedDocument,
  );

  const filteredFinderPolicies = useMemo(() => {
    return filterPolicyDataset(finderPolicies, {
      category: finderCategory,
      search: finderSearch,
      min_sum_insured: finderFilters.min_sum_insured,
      max_sum_insured: finderFilters.max_sum_insured,
      copay: finderFilters.copay,
      deductible: finderFilters.deductible,
      initial_waiting: finderFilters.initial_waiting,
      ped_waiting: finderFilters.ped_waiting,
      sortBy,
    });
  }, [finderPolicies, finderCategory, finderSearch, finderFilters, sortBy]);

  return (
    <div className="page">
      <PageHeader
        title="Insurance"
        description={
          activeModule === "assistant"
            ? "Upload your insurance policy and ask questions about your coverage."
            : "Discover and explore health insurance policies that match your needs."
        }
        badge={<SampleBadge>Insurance Agent</SampleBadge>}
      />

      <div className="insurance-module-switcher">
        <button
          type="button"
          className={`insurance-module-tab ${
            activeModule === "assistant" ? "is-active" : ""
          }`}
          onClick={() => setActiveModule("assistant")}
          aria-pressed={activeModule === "assistant"}
        >
          <span className="insurance-module-number">01</span>
          <span className="insurance-module-details">
            <strong>Policy Assistant</strong>
            <small>Understand your existing policy</small>
          </span>
        </button>

        <button
          type="button"
          className={`insurance-module-tab ${
            activeModule === "finder" ? "is-active" : ""
          }`}
          onClick={() => setActiveModule("finder")}
          aria-pressed={activeModule === "finder"}
        >
          <span className="insurance-module-number">02</span>
          <span className="insurance-module-details">
            <strong>Find Insurance</strong>
            <small>Discover other insurance policies</small>
          </span>
        </button>
      </div>

      {activeModule === "assistant" && (
        <div className="split">
          <section className="panel" aria-labelledby="ask-h">
            <h2 id="ask-h" className="panel__title">
              Ask about insurance
            </h2>

            <form onSubmit={submit} className="stack">
              {/* Select uploaded document */}
              <div className="stack">
                <label htmlFor="insurance-document">
                  <strong>Select insurance document</strong>
                </label>

                <div className="insurance-select-wrap">
                  <FileText size={18} />

                  <select
                    id="insurance-document"
                    className="field insurance-select"
                    value={selectedDocument}
                    onChange={(e) => {
                      setSelectedDocument(e.target.value);
                      setAnswer(null);
                      setError("");
                    }}
                  >
                    <option value="">Choose a policy document</option>
                    <option value="all">All Documents</option>

                    {documents.map((doc) => (
                      <option key={doc.filename} value={doc.filename}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>

                  <ChevronDown size={16} />
                </div>

                {selectedDocument === "all" ? (
                  <div className="insurance-selected-file">
                    <FileText size={16} />
                    <span>Searching across all uploaded policies</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDocument("")}
                      aria-label="Clear selection"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  selectedDoc && (
                    <div className="insurance-selected-file">
                      <FileText size={16} />
                      <span>{selectedDoc.filename}</span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocument("");
                          setAnswer(null);
                        }}
                        aria-label="Clear selected document"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )
                )}

                {documents.length === 0 && (
                  <small className="muted">
                    No insurance documents uploaded yet.
                  </small>
                )}
              </div>

              {/* Upload PDF */}
              <div className="insurance-upload">
                <input
                  id="insurance-pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleUpload}
                  hidden
                  disabled={uploading}
                />

                <label
                  htmlFor="insurance-pdf-upload"
                  className="insurance-upload__label"
                >
                  {uploading ? (
                    <LoaderCircle size={22} className="spin" />
                  ) : (
                    <Upload size={22} />
                  )}

                  <strong>
                    {uploading ? "Uploading PDF..." : "Upload insurance PDF"}
                  </strong>

                  <span>Click to select a policy document</span>

                  <small>PDF files only</small>
                </label>
              </div>

              {uploadMessage && (
                <p className="success-message" role="status">
                  {uploadMessage}
                </p>
              )}

              {/* Question input */}
              <textarea
                className="field field--area"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask a question about your selected insurance policy..."
                aria-label="Insurance question"
              />

              {/* Suggested questions */}
              <div className="chip-row">
                {INSURANCE_SUGGESTIONS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="chip chip--btn"
                    onClick={() => setText(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                className="btn btn--primary"
                type="submit"
                disabled={
                  asking || uploading || !text.trim() || !selectedDocument
                }
              >
                {asking ? (
                  <>
                    <LoaderCircle size={16} className="spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Ask
                  </>
                )}
              </button>
            </form>

            {/* Error message */}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {/* Actual Gemini answer */}
            {answer && (
              <div
                className="answer-preview insurance-answer-card"
                aria-live="polite"
              >
                <div className="insurance-answer-header">
                  <div>
                    <span className="insurance-ai-label">
                      <FileText size={15} />
                      INSURANCE AI ASSISTANT
                    </span>
                    <h3>Policy Answer</h3>
                  </div>

                  <SampleBadge>AI Generated</SampleBadge>
                </div>

                <div className="insurance-document-info">
                  <FileText size={17} />
                  <span>{answer.filename}</span>
                </div>

                <div className="insurance-answer-content">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h2>{children}</h2>,
                      h2: ({ children }) => <h3>{children}</h3>,
                      h3: ({ children }) => <h4>{children}</h4>,
                      p: ({ children }) => <p>{children}</p>,
                      ul: ({ children }) => <ul>{children}</ul>,
                      ol: ({ children }) => <ol>{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong>{children}</strong>,
                    }}
                  >
                    {(answer.answer || "").replace(
                      /\s*\[Policy:\s*[^,\]]+,\s*Page:\s*\d+\]/g,
                      "",
                    )}
                  </ReactMarkdown>
                </div>

                {/* Consolidated sources */}
                {answer.sources?.length > 0 && (
                  <div className="insurance-sources">
                    <div className="insurance-sources-heading">
                      <FileText size={18} />
                      <div>
                        <h4>Sources & References</h4>
                        <p>Information retrieved from your uploaded policy</p>
                      </div>
                    </div>

                    <div className="insurance-source-list">
                      {Array.from(
                        new Map(
                          answer.sources.map((source) => [
                            `${source.filename}-${source.page_number}`,
                            source,
                          ]),
                        ).values(),
                      ).map((source, index) => (
                        <div
                          className="insurance-source"
                          key={`${source.filename}-${source.page_number}-${index}`}
                        >
                          <span className="insurance-source-number">
                            {index + 1}
                          </span>

                          <div>
                            <strong>{source.filename}</strong>
                            <span>
                              Page {source.page_number}
                              {source.section_heading
                                ? ` · ${source.section_heading}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Claim workflow */}
          <section className="panel" aria-labelledby="claim-h">
            <h2 id="claim-h" className="panel__title">
              How a claim usually works
            </h2>

            <ol className="steps">
              {CLAIM_STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>

            <small className="muted">
              General overview. Your insurer’s rules decide the details.
            </small>
          </section>
        </div>
      )}

      {activeModule === "finder" && (
        <div className="insurance-finder">
          {!selectedFinderPolicy ? (
            <>
              <section className="panel insurance-finder-intro">
                <h2>Find Your Health Insurance</h2>
                <p>
                  Explore health insurance policies from different insurers.
                  Compare their coverage, benefits and waiting periods.
                </p>
              </section>

              <section className="panel">
                <h2 className="panel__title">Discover Insurance Plans</h2>

                <p className="muted">
                  Search and explore available health insurance policies.
                </p>

                <div className="stack">
                  <input
                    type="text"
                    className="field"
                    placeholder="Search by policy name, insurer or UIN..."
                    value={finderSearch}
                    onChange={(e) => setFinderSearch(e.target.value)}
                  />

                  <select
                    className="field"
                    value={finderCategory}
                    onChange={(e) => setFinderCategory(e.target.value)}
                  >
                    <option value="all">All health insurance categories</option>
                    <option value="health-indemnity">Health Indemnity</option>
                    <option value="health-senior">Senior Citizen Health</option>
                    <option value="critical-illness">Critical Illness</option>
                    <option value="health-topup">Health Top-up</option>
                    <option value="hospital-cash">Hospital Cash</option>
                  </select>
                </div>
                {/* Policy Finder Filters */}

                <div className="insurance-finder-filters">
                  {/* Sum Insured Range */}
                  <div className="insurance-sum-range">
                    <div className="insurance-filter-heading">
                      <strong>Sum Insured Range</strong>
                      <small>Set your preferred coverage amount</small>
                    </div>

                    <div className="insurance-sum-range-inputs">
                      <div className="insurance-filter-field">
                        <label htmlFor="min-sum-insured">
                          Minimum Amount (₹)
                        </label>
                        <input
                          id="min-sum-insured"
                          type="number"
                          className="field"
                          placeholder="e.g. 50000"
                          min="0"
                          value={finderFilters.min_sum_insured}
                          onChange={(e) =>
                            setFinderFilters({
                              ...finderFilters,
                              min_sum_insured: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="insurance-filter-field">
                        <label htmlFor="max-sum-insured">
                          Maximum Amount (₹)
                        </label>
                        <input
                          id="max-sum-insured"
                          type="number"
                          className="field"
                          placeholder="e.g. 1000000"
                          min="0"
                          value={finderFilters.max_sum_insured}
                          onChange={(e) =>
                            setFinderFilters({
                              ...finderFilters,
                              max_sum_insured: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Co-payment */}

                  <select
                    className="field"
                    value={finderFilters.copay}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        copay: e.target.value,
                      })
                    }
                  >
                    <option value="">All Co-payment</option>
                    <option value="no_copay">No Co-payment</option>
                    <option value="optional">Optional Co-payment</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                    <option value="conditional">Other / Conditional</option>
                  </select>

                  {/* Deductible */}
                  <select
                    className="field"
                    value={finderFilters.deductible}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        deductible: e.target.value,
                      })
                    }
                  >
                    <option value="">All Deductibles</option>
                    <option value="no_deductible">No Deductible</option>
                    <option value="optional">Optional Deductible</option>
                    <option value="has_deductible">Has Deductible</option>
                  </select>

                  {/* Initial Waiting */}
                  <select
                    className="field"
                    value={finderFilters.initial_waiting}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        initial_waiting: e.target.value,
                      })
                    }
                  >
                    <option value="">All Initial Waiting Periods</option>
                    {(filterOptions.initial_waiting || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  {/* PED Waiting */}
                  <select
                    className="field"
                    value={finderFilters.ped_waiting}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        ped_waiting: e.target.value,
                      })
                    }
                  >
                    <option value="">All PED Waiting Periods</option>
                    {(filterOptions.ped_waiting || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={fetchFinderPolicies}
                    disabled={finderLoading}
                  >
                    <SlidersHorizontal size={15} style={{ marginRight: '0.35rem' }} />
                    Apply Filters
                  </button>

                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleResetFilters}
                    disabled={finderLoading}
                    title="Reset all filters to default"
                  >
                    <RotateCcw size={15} style={{ marginRight: '0.35rem' }} />
                    Reset Filters
                  </button>
                </div>

                {finderLoading && <p className="muted" style={{ marginTop: '0.75rem' }}>Loading policies...</p>}

                {finderError && (
                  <div className="error-message" role="alert" style={{ marginTop: '0.75rem' }}>
                    {finderError}
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={fetchFinderPolicies}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!finderLoading && !finderError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginTop: '1.25rem',
                      marginBottom: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: 'var(--r-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                      Showing <strong>{filteredFinderPolicies.length}</strong> of {finderPolicies.length} policies
                      {(finderFilters.copay ||
                        finderFilters.deductible ||
                        finderFilters.initial_waiting ||
                        finderFilters.ped_waiting ||
                        finderFilters.min_sum_insured ||
                        finderFilters.max_sum_insured ||
                        finderCategory !== 'all') && ' (filters applied)'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="finder-sort" style={{ fontSize: '0.825rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                        Sort by:
                      </label>
                      <select
                        id="finder-sort"
                        className="field"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.825rem', width: 'auto' }}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="relevance">Relevance / Best Match</option>
                        <option value="sum_desc">Sum Insured: High to Low</option>
                        <option value="sum_asc">Sum Insured: Low to High</option>
                        <option value="name_asc">Policy Name: A to Z</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="card-grid card-grid--3">
                  {filteredFinderPolicies.map((policy) => (
                    <article className="policy-card" key={policy.uin}>
                      <span className="policy-card__kind">
                        {policy.category?.replaceAll("-", " ")}
                      </span>

                      <h3>{policy.name}</h3>

                      <p>
                        <strong>Insurer:</strong> {policy.insurer}
                      </p>

                      <p>
                        <strong>UIN:</strong> {policy.uin}
                      </p>

                      {policy.filter_values && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0 0.85rem' }}>
                          {policy.filter_values.sum_insured_options?.[0] && (
                            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                              {policy.filter_values.sum_insured_options[0].length > 30
                                ? policy.filter_values.sum_insured_options[0].slice(0, 28) + '…'
                                : policy.filter_values.sum_insured_options[0]}
                            </span>
                          )}
                          {policy.filter_values.copay?.[0] && (
                            <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                              Co-pay: {policy.filter_values.copay[0].length > 22
                                ? policy.filter_values.copay[0].slice(0, 20) + '…'
                                : policy.filter_values.copay[0]}
                            </span>
                          )}
                          {policy.filter_values.ped_waiting?.[0] && (
                            <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                              PED: {policy.filter_values.ped_waiting[0]}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => fetchPolicyDetails(policy.uin)}
                      >
                        View Details
                      </button>
                    </article>
                  ))}
                </div>

                {!finderLoading &&
                  !finderError &&
                  filteredFinderPolicies.length === 0 && (
                    <p className="muted">
                      No matching insurance policies found.
                    </p>
                  )}
              </section>
            </>
          ) : (
            <section className="insurance-policy-details">
              <div className="section__head">
                <div>
                  <p className="muted">Insurance Policy</p>
                  <h2>Policy Details</h2>
                </div>

                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closePolicyDetails}
                >
                  ← Back to Policies
                </button>
              </div>

              {detailsLoading && (
                <div className="panel">
                  <p className="muted">Loading policy details...</p>
                </div>
              )}

              {detailsError && (
                <div className="panel error-message" role="alert">
                  {detailsError}
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => fetchPolicyDetails(selectedFinderPolicy)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {policyDetails && (
                <>
                  <section className="panel">
                    <span className="policy-card__kind">
                      {policyDetails.category_name || policyDetails.category}
                    </span>

                    <h2>{policyDetails.name}</h2>

                    <p>
                      <strong>Insurer:</strong>{" "}
                      {typeof policyDetails.insurer === "object"
                        ? policyDetails.insurer?.name
                        : policyDetails.insurer}
                    </p>

                    <p>
                      <strong>UIN:</strong> {policyDetails.uin}
                    </p>

                    <p>
                      <strong>Status:</strong> {policyDetails.status}
                    </p>

                    <h3>Policy Summary</h3>

                    <p>{policyDetails.summary || "Summary not available."}</p>

                    {policyDetails.url && (
                      <a
                        href={policyDetails.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View policy on IndiaInsurances ↗
                      </a>
                    )}
                  </section>

                  <section className="panel">
                    <h3 className="panel__title">Key Features</h3>

                    {(() => {
                      const keywords =
                        /sum insured|co.?pay|room rent|waiting period|policy term|deductible|cumulative bonus/i;

                      const keyFacts = (policyDetails.facts || []).filter(
                        (fact) =>
                          keywords.test(
                            `${fact.label || ""} ${fact.key || ""}`,
                          ) &&
                          (fact.display || fact.value != null || fact.note),
                      );

                      return keyFacts.length > 0 ? (
                        <div className="stack">
                          {keyFacts.map((fact, index) => (
                            <div
                              className="insurance-policy-fact"
                              key={`${fact.key || fact.label}-${index}`}
                            >
                              <strong>{fact.label || fact.key}</strong>
                              <p>
                                {fact.display ||
                                  (typeof fact.value === "object"
                                    ? JSON.stringify(fact.value)
                                    : fact.value) ||
                                  fact.note}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">
                          Key feature details are not available in the extracted
                          data.
                        </p>
                      );
                    })()}
                  </section>

                  <section className="panel">
                    <h3 className="panel__title">More Information</h3>

                    {[
                      {
                        title: "Coverage & Benefits",
                        pattern:
                          /coverage|benefit|hospitalisation|hospitalization|maternity|ambulance|treatment/i,
                      },
                      {
                        title: "Waiting Periods",
                        pattern:
                          /waiting period|pre.?existing|initial waiting/i,
                      },
                      {
                        title: "Exclusions",
                        pattern: /exclusion|not covered|excluded/i,
                      },
                      {
                        title: "Claim Process",
                        pattern:
                          /claim|reimbursement|cashless|pre.?authorisation/i,
                      },
                    ].map((group) => {
                      const facts = (policyDetails.facts || []).filter(
                        (fact) =>
                          group.pattern.test(
                            `${fact.label || ""} ${fact.key || ""}`,
                          ) &&
                          !/sum insured|co.?pay|room rent|waiting period|policy term|deductible|cumulative bonus/i.test(
                            `${fact.label || ""} ${fact.key || ""}`,
                          ),
                      );

                      return (
                        <details
                          className="insurance-info-accordion"
                          key={group.title}
                        >
                          <summary>
                            {group.title} ({facts.length})
                          </summary>

                          {facts.length > 0 ? (
                            <div className="stack">
                              {facts.map((fact, index) => (
                                <div
                                  className="insurance-policy-fact"
                                  key={`${fact.key || fact.label}-${index}`}
                                >
                                  <strong>{fact.label || fact.key}</strong>

                                  <p>
                                    {fact.display ||
                                      (typeof fact.value === "object"
                                        ? JSON.stringify(fact.value)
                                        : fact.value) ||
                                      fact.note ||
                                      "Not specified"}
                                  </p>

                                  {fact.quote && (
                                    <p className="insurance-policy-quote">
                                      {fact.quote}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="muted">
                              No extracted information available in this
                              section.
                            </p>
                          )}
                        </details>
                      );
                    })}
                  </section>

                  <section className="panel">
                    <h3 className="panel__title">Policy Documents</h3>

                    {policyDetails.documents?.length > 0 ? (
                      <div className="stack">
                        {policyDetails.documents.map((doc, index) => (
                          <div
                            className="insurance-policy-fact"
                            key={`${doc.kind}-${index}`}
                          >
                            <strong>{doc.label || doc.kind}</strong>

                            <p>
                              {doc.kind} ·{" "}
                              {doc.pages || "Page count unavailable"} pages
                            </p>

                            {doc.source_url && (
                              <a
                                href={doc.source_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open Original PDF ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No documents available.</p>
                    )}
                  </section>

                  <p className="muted">
                    Policy information is provided for research purposes. Always
                    verify current terms with the insurer and original policy
                    wording.
                  </p>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
