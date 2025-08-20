import { useState, useEffect } from "react";
import {
  registerUser,
  loginUser,
  uploadUserFile,
  listUserFiles,
  getFileLink,      // ✅ updated import
  getAllPatients
} from "./awsClients";

export default function App() {
  const [stage, setStage] = useState("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [files, setFiles] = useState([]);
  const [downloading, setDownloading] = useState(null);

  const [doctorName, setDoctorName] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handleRegister = async () => {
    try {
      await registerUser({ username, password, email, name });
      alert("Registered. Now login.");
      setStage("login");
    } catch (e) {
      alert(e.message || "Registration failed");
    }
  };

  const handleLogin = async () => {
    try {
      await loginUser({ username, password });
      setStage("portal");
    } catch (e) {
      alert(e.message || "Login failed");
    }
  };

  const refreshList = async () => {
    const keys = await listUserFiles({ username });
    setFiles(keys);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadUserFile({ username, file });
    await refreshList();
    alert("Uploaded!");
  };

  const handleDownload = async (key) => {
    try {
      setDownloading(key);
      const url = await getFileLink({ key }); // ✅ changed to getFileLink
      window.open(url, "_blank");
    } finally {
      setDownloading(null);
    }
  };

  const handleDoctorLogin = () => {
    if (doctorName && doctorPassword && doctorId) {
      setStage("doctorPortal");
    } else {
      alert("Please enter all fields");
    }
  };

  const fetchAllPatients = async () => {
    const allPatients = await getAllPatients();
    setPatients(allPatients);
  };

  const viewPatientFiles = async (patientUsername) => {
    const keys = await listUserFiles({ username: patientUsername });
    setSelectedPatient({ username: patientUsername, files: keys });
    setStage("patientFiles");
  };

  const handleDoctorFileOpen = async (key) => {
    try {
      setDownloading(key);
      const url = await getFileLink({ key }); // ✅ changed to getFileLink
      window.open(url, "_blank");
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    if (stage === "portal") refreshList();
  }, [stage]);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <h2>Patient Portal (Demo)</h2>

      {stage === "register" && (
        <div>
          <h3>Register</h3>
          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} /><br />
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /><br />
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /><br />
          <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /><br />
          <button onClick={handleRegister}>Sign Up</button>{" "}
          <button onClick={()=>setStage("login")}>Go to Login</button>{" "}
          <button onClick={()=>setStage("doctorLogin")}>Login as Doctor</button>
        </div>
      )}

      {stage === "login" && (
        <div>
          <h3>Login</h3>
          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} /><br />
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /><br />
          <button onClick={handleLogin}>Login</button>{" "}
          <button onClick={()=>setStage("register")}>Go to Register</button>
        </div>
      )}

      {stage === "portal" && (
        <div>
          <h3>Welcome, {username}</h3>
          <input type="file" onChange={handleUpload} />
          <button onClick={refreshList} style={{ marginLeft: 8 }}>Refresh</button>
          <h4 style={{ marginTop: 16 }}>My Files</h4>
          {files.length === 0 ? (
            <p>No files yet.</p>
          ) : (
            <ul>
              {files.map((k) => (
                <li key={k} style={{ marginBottom: 6 }}>
                  <code>{k.split("/").slice(-1)[0]}</code>{" "}
                  <button disabled={downloading===k} onClick={() => handleDownload(k)}>
                    {downloading===k ? "Opening..." : "Open"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setStage("login")} style={{ marginTop: 12 }}>Logout</button>
        </div>
      )}

      {stage === "doctorLogin" && (
        <div>
          <h3>Doctor Login</h3>
          <input placeholder="Doctor Name" value={doctorName} onChange={e=>setDoctorName(e.target.value)} /><br />
          <input placeholder="Password" type="password" value={doctorPassword} onChange={e=>setDoctorPassword(e.target.value)} /><br />
          <input placeholder="Doctor ID" value={doctorId} onChange={e=>setDoctorId(e.target.value)} /><br />
          <button onClick={handleDoctorLogin}>Login</button>{" "}
          <button onClick={()=>setStage("register")}>Back</button>
        </div>
      )}

      {stage === "doctorPortal" && (
        <div>
          <h3>Doctor Portal</h3>
          <button onClick={fetchAllPatients}>Get All Patients Data</button>
          <table border="1" style={{ marginTop: 12, width: "200%" }}>
            <thead>
              <tr>
                <th>patient  FULL Name</th>
                <th> Patient Email</th>
                <th>Name</th>
                <th>View info</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.username}>
                  <td>{p.username}</td>
                  <td>{p.email}</td>
                  <td>{p.name}</td>
                  <td><button onClick={() => viewPatientFiles(p.username)}>View Patient Info</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setStage("doctorLogin")} style={{ marginTop: 12 }}>Logout</button>
        </div>
      )}

      {stage === "patientFiles" && selectedPatient && (
        <div>
          <h3>Files for {selectedPatient.username}</h3>
          {selectedPatient.files.length === 0 ? (
            <p>No files found.</p>
          ) : (
            <ul>
              {selectedPatient.files.map((k) => (
                <li key={k} style={{ marginBottom: 6 }}>
                  <code>{k.split("/").slice(-1)[0]}</code>{" "}
                  <button
                    onClick={async () => {
                      const url = await getFileLink({ key: k });
                      window.open(url, "_blank");
                    }}
                  >
                    Open Link
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setStage("doctorPortal")} style={{ marginTop: 12 }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
