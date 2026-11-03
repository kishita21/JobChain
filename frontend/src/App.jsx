import { useState, useEffect } from "react";
import {
  BriefcaseBusiness, LayoutDashboard, PlusCircle,
  FileText, Search, MapPin, Clock, Users,
  X, CheckCircle, Building2
} from "lucide-react";
import "./App.css";

const API = "http://localhost:4000/api";

function App() {
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applications, setApplications] = useState([]);

  const [jobForm, setJobForm] = useState({
    title: "", company: "", location: "",
    salary: "", description: ""
  });

  const [applyForm, setApplyForm] = useState({
    applicantName: "", email: "", skills: ""
  });

  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    try {
      const response = await fetch(`${API}/jobs`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load jobs");
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Could not fetch blockchain jobs: " + error.message);
    }
  };
const loadApplications = async () => {
  try {
    const jobsResponse = await fetch(`${API}/jobs`);
    const jobsData = await jobsResponse.json();

    const allApplications = await Promise.all(
      jobsData.map(async (job) => {
        const response = await fetch(
          `${API}/jobs/${encodeURIComponent(job.jobId)}/applications`
        );

        if (!response.ok) return [];

        const data = await response.json();

        return data.map((app) => ({
          ...app,
          jobId: job.jobId,
          jobTitle: job.title
        }));
      })
    );

    setApplications(allApplications.flat());
  } catch (error) {
    console.error("Error loading applications:", error);
  }
};

useEffect(() => {
  loadJobs();
  loadApplications();
}, []);

  const postJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...jobForm,
        jobId: "JOB" + Date.now()
      };

      const response = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Job creation failed");

      alert("Job successfully submitted to Hyperledger Fabric!");
      setJobForm({
        title: "", company: "", location: "",
        salary: "", description: ""
      });
      setShowPost(false);
      await loadJobs();
    } catch (error) {
      alert("Blockchain transaction failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyJob = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    setLoading(true);

    try {
      const applicationId = "APP" + Date.now();

      const response = await fetch(
        `${API}/jobs/${encodeURIComponent(selectedJob.jobId)}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...applyForm,
            applicationId
          })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Application failed");

      setApplications(prev => [...prev, {
        ...applyForm,
        applicationId,
        jobId: selectedJob.jobId,
        jobTitle: selectedJob.title,
        status: "SUBMITTED"
      }]);

      alert("Application successfully recorded on Hyperledger Fabric!");
      setApplyForm({ applicantName: "", email: "", skills: "" });
      setShowApply(false);
      setActiveTab("Applications");
    } catch (error) {
      alert("Blockchain application failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    `${job.title} ${job.company} ${job.location}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><BriefcaseBusiness /></div>
          <div>
            <h2>Job<span>Chain</span></h2>
            <small>BLOCKCHAIN MARKETPLACE</small>
          </div>
        </div>

        <p className="menu-label">MAIN MENU</p>

        {[
          { name: "Dashboard", icon: LayoutDashboard },
          { name: "Find Jobs", icon: Search },
          { name: "Applications", icon: FileText }
        ].map(item => (
          <button
            key={item.name}
            className={`nav-item ${activeTab === item.name ? "active" : ""}`}
            onClick={() => setActiveTab(item.name)}
          >
            <item.icon size={19} />
            {item.name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="blockchain-status">
            <span className="status-dot"></span>
            <div>
              <strong>Blockchain Network</strong>
              <small>mychannel connected</small>
            </div>
          </div>
          <p>Powered by Hyperledger Fabric</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="welcome">WELCOME TO JOBCHAIN</p>
            <h1>{activeTab}</h1>
          </div>
          <button className="post-button" onClick={() => setShowPost(true)}>
            <PlusCircle size={18} /> Post a Job
          </button>
        </header>

        {activeTab !== "Applications" && (
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple"><BriefcaseBusiness /></div>
              <p>Available Jobs</p>
              <h2>{jobs.length}</h2>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Users /></div>
              <p>Applications Submitted</p>
              <h2>{applications.length}</h2>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><Building2 /></div>
              <p>Companies</p>
              <h2>{new Set(jobs.map(j => j.company)).size}</h2>
            </div>
          </section>
        )}

        {activeTab !== "Applications" && (
          <section className="jobs-section">
            <div className="section-heading">
              <div>
                <h2>{activeTab === "Dashboard" ? "Latest Opportunities" : "Explore Jobs"}</h2>
                <p>Discover opportunities and take the next step in your career.</p>
              </div>
              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder="Search jobs..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="job-grid">
              {filteredJobs.map(job => (
                <div className="job-card" key={job.jobId}>
                  <div className="job-card-top">
                    <div className="company-icon"><Building2 /></div>
                    <span className="open-tag">{job.status}</span>
                  </div>
                  <h3>{job.title}</h3>
                  <p className="company-name">{job.company}</p>

                  <div className="job-details">
                    <span><MapPin size={15} /> {job.location}</span>
                    <span><BriefcaseBusiness size={15} /> {job.salary}</span>
                  </div>

                  <p className="job-description">{job.description}</p>

                  <div className="job-footer">
                    <span>{job.jobId}</span>
                    <button onClick={() => {
                      setSelectedJob(job);
                      setShowApply(true);
                    }}>Apply Now →</button>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <p>No matching jobs found.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === "Applications" && (
          <section className="jobs-section">
            <div className="section-heading">
              <div>
                <h2>My Applications</h2>
                <p>Track your submitted job applications.</p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="empty-state">
                <FileText size={40} />
                <h3>No applications yet</h3>
                <p>Your submitted applications will appear here.</p>
                <button onClick={() => setActiveTab("Find Jobs")}>Explore Jobs</button>
              </div>
            ) : applications.map(app => (
              <div className="application-card" key={app.applicationId}>
                <div>
                  <h3>{app.jobTitle}</h3>
                  <p>{app.applicantName} · {app.email}</p>
                  <small>{app.applicationId} · {app.jobId}</small>
                </div>
                <span className="open-tag">{app.status}</span>
              </div>
            ))}
          </section>
        )}

        <footer>
          <span>© 2026 JobChain Marketplace</span>
          <span><CheckCircle size={14} /> Secured by Hyperledger Fabric</span>
        </footer>
      </main>

      {(showPost || showApply) && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-button" onClick={() => {
              setShowPost(false);
              setShowApply(false);
            }}><X /></button>

            <h2>{showPost ? "Post a New Job" : "Apply for Job"}</h2>
            <p>{showPost ? "Create a new opportunity." : `Applying for ${selectedJob?.title}`}</p>

            <form onSubmit={showPost ? postJob : applyJob}>
              {showPost ? (
                <>
                  {["title", "company", "location", "salary", "description"].map(field => (
                    <input
                      key={field}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      required
                      value={jobForm[field]}
                      onChange={e => setJobForm({...jobForm, [field]: e.target.value})}
                    />
                  ))}
                </>
              ) : (
                <>
                  {["applicantName", "email", "skills"].map(field => (
                    <input
                      key={field}
                      placeholder={field === "applicantName" ? "Full Name" : field === "email" ? "Email Address" : "Your Skills"}
                      required
                      value={applyForm[field]}
                      onChange={e => setApplyForm({...applyForm, [field]: e.target.value})}
                    />
                  ))}
                </>
              )}
              <button className="submit-button" type="submit">
                {showPost ? "Publish Job" : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
