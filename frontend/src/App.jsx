import React, { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { ArrowRight, User, GraduationCap, Building2, Loader2, AlertCircle, CheckCircle, Edit2, X, Save } from 'lucide-react';

const XCMStudentVisualizer = () => {
  const [apis, setApis] = useState({ university: null, company: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    university: 'disconnected',
    company: 'disconnected'
  });

  const [universityStudents, setUniversityStudents] = useState([]);
  const [companyStudents, setCompanyStudents] = useState([]);
  const [alice, setAlice] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    age: '',
    gender: 'Male'
  });
  const [creating, setCreating] = useState(false);
  const [transferring, setTransferring] = useState(null);
  const [palletName, setPalletName] = useState(null);

  // Edit state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    surname: '',
    age: '',
    gender: 'Male'
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        const keyring = new Keyring({ type: 'sr25519' });
        const aliceAccount = keyring.addFromUri('//Alice');
        setAlice(aliceAccount);
        console.log('Alice address:', aliceAccount.address);

        console.log('Connecting to University Parachain...');
        setConnectionStatus(prev => ({ ...prev, university: 'connecting' }));
        const wsProviderUniversity = new WsProvider('ws://127.0.0.1:9988');
        const apiUniversity = await ApiPromise.create({ provider: wsProviderUniversity });
        await apiUniversity.isReady;
        console.log('✅ Connected to University Parachain');
        setConnectionStatus(prev => ({ ...prev, university: 'connected' }));

        console.log('Connecting to Company Parachain...');
        setConnectionStatus(prev => ({ ...prev, company: 'connecting' }));
        const wsProviderCompany = new WsProvider('ws://127.0.0.1:9999');
        const apiCompany = await ApiPromise.create({ provider: wsProviderCompany });
        await apiCompany.isReady;
        console.log('✅ Connected to Company Parachain');
        setConnectionStatus(prev => ({ ...prev, company: 'connected' }));

        const detectedPalletName = detectPalletName(apiUniversity);
        if (!detectedPalletName) {
          throw new Error('Could not find student pallet. Available pallets: ' + 
            Object.keys(apiUniversity.query).join(', '));
        }
        setPalletName(detectedPalletName);
        console.log('✅ Detected pallet name:', detectedPalletName);

        setApis({ university: apiUniversity, company: apiCompany });
        await loadStudentsFromChains(apiUniversity, apiCompany, detectedPalletName);
        setLoading(false);
      } catch (err) {
        console.error('Connection error:', err);
        setError(`Failed to connect: ${err.message}`);
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (apis.university) apis.university.disconnect();
      if (apis.company) apis.company.disconnect();
    };
  }, []);

  const detectPalletName = (api) => {
    const possibleNames = [
      'templatePallet',
      'studentRegistry',
      'palletStudentRegistry', 
      'student',
      'students',
      'studentPallet'
    ];

    for (const name of possibleNames) {
      if (api.query[name] && api.query[name].studentCount) {
        return name;
      }
    }

    console.log('Available pallets:', Object.keys(api.query));
    return null;
  };

  const loadStudentsFromChains = async (uniApi, compApi, pallet) => {
    try {
      console.log('Loading students using pallet:', pallet);
      
      const uniCount = await uniApi.query[pallet].studentCount();
      console.log('University student count:', uniCount.toNumber());
      const uniStudentsList = [];
      
      for (let i = 0; i < uniCount.toNumber(); i++) {
        const studentOption = await uniApi.query[pallet].students(i);
        if (studentOption.isSome) {
          const student = studentOption.unwrap();
          uniStudentsList.push({
            id: i,
            name: new TextDecoder().decode(student.name),
            surname: new TextDecoder().decode(student.surname),
            age: student.age.toNumber(),
            gender: student.gender.toString(),
            hasGraduated: student.hasGraduated.valueOf()
          });
        }
      }
      setUniversityStudents(uniStudentsList);
      console.log('University students:', uniStudentsList);

      const compCount = await compApi.query[pallet].studentCount();
      console.log('Company student count:', compCount.toNumber());
      const compStudentsList = [];
      
      for (let i = 0; i < compCount.toNumber(); i++) {
        const studentOption = await compApi.query[pallet].students(i);
        if (studentOption.isSome) {
          const student = studentOption.unwrap();
          compStudentsList.push({
            id: i,
            name: new TextDecoder().decode(student.name),
            surname: new TextDecoder().decode(student.surname),
            age: student.age.toNumber(),
            gender: student.gender.toString(),
            hasGraduated: student.hasGraduated.valueOf()
          });
        }
      }
      setCompanyStudents(compStudentsList);
      console.log('Company students:', compStudentsList);

    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const startEditing = (student) => {
    setEditingStudent(student.id);
    setEditFormData({
      name: student.name,
      surname: student.surname,
      age: student.age.toString(),
      gender: student.gender
    });
  };

  const cancelEditing = () => {
    setEditingStudent(null);
    setEditFormData({
      name: '',
      surname: '',
      age: '',
      gender: 'Male'
    });
  };

  const updateStudent = async (studentId) => {
    if (!editFormData.name || !editFormData.surname || !editFormData.age) {
      alert('Please fill in all fields');
      return;
    }

    if (!apis.university || !alice || !palletName) {
      alert('Not connected to blockchain');
      return;
    }

    setUpdating(true);

    try {
      const nameBytes = Array.from(new TextEncoder().encode(editFormData.name));
      const surnameBytes = Array.from(new TextEncoder().encode(editFormData.surname));
      const age = parseInt(editFormData.age);
      const gender = editFormData.gender;

      console.log('Updating student:', { studentId, nameBytes, surnameBytes, age, gender });

      const unsub = await apis.university.tx[palletName]
        .updateStudent(studentId, nameBytes, surnameBytes, age, gender)
        .signAndSend(alice, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Update included in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Update finalized at block ${status.asFinalized}`);
            
            events.forEach(({ event }) => {
              if (apis.university.events.system.ExtrinsicFailed.is(event)) {
                console.error('Transaction failed:', event.data.toString());
              }
            });

            loadStudentsFromChains(apis.university, apis.company, palletName);
            cancelEditing();
            setUpdating(false);
            unsub();
          }
        });

    } catch (err) {
      console.error('Error updating student:', err);
      alert(`Failed to update student: ${err.message}`);
      setUpdating(false);
    }
  };

  const createStudent = async () => {
    if (!formData.name || !formData.surname || !formData.age) {
      alert('Please fill in all fields');
      return;
    }

    if (!apis.university || !alice || !palletName) {
      alert('Not connected to blockchain');
      return;
    }

    setCreating(true);

    try {
      const nameBytes = Array.from(new TextEncoder().encode(formData.name));
      const surnameBytes = Array.from(new TextEncoder().encode(formData.surname));
      const age = parseInt(formData.age);
      const gender = formData.gender;

      console.log('Creating student:', { nameBytes, surnameBytes, age, gender });

      const unsub = await apis.university.tx[palletName]
        .createStudent(nameBytes, surnameBytes, age, gender)
        .signAndSend(alice, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Transaction included in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Transaction finalized at block ${status.asFinalized}`);
            
            events.forEach(({ event }) => {
              if (apis.university.events.system.ExtrinsicFailed.is(event)) {
                console.error('Transaction failed:', event.data.toString());
              }
            });

            loadStudentsFromChains(apis.university, apis.company, palletName);
            setFormData({ name: '', surname: '', age: '', gender: 'Male' });
            setCreating(false);
            unsub();
          }
        });

    } catch (err) {
      console.error('Error creating student:', err);
      alert(`Failed to create student: ${err.message}`);
      setCreating(false);
    }
  };

  const graduateStudent = async (studentId) => {
    if (!apis.university || !alice || !palletName) {
      alert('Not connected to blockchain');
      return;
    }

    setTransferring(studentId);

    try {
      console.log(`Graduating student ID ${studentId}...`);

      const unsub = await apis.university.tx[palletName]
        .graduateStudent(studentId)
        .signAndSend(alice, async ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Graduation transaction in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Graduation finalized at block ${status.asFinalized}`);
            
            events.forEach(({ event }) => {
              console.log('Event:', event.section, event.method, event.data.toString());
              if (apis.university.events.system.ExtrinsicFailed.is(event)) {
                console.error('Transaction failed:', event.data.toString());
              }
            });

            await new Promise(resolve => setTimeout(resolve, 3000));
            await loadStudentsFromChains(apis.university, apis.company, palletName);
            setTransferring(null);
            unsub();
          }
        });

    } catch (err) {
      console.error('Error graduating student:', err);
      alert(`Failed to graduate student: ${err.message}`);
      setTransferring(null);
    }
  };

  const deleteStudent = async (studentId) => {
    if (!apis.university || !alice || !palletName) {
      alert('Not connected to blockchain');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      console.log(`Deleting student ID ${studentId}...`);

      const unsub = await apis.university.tx[palletName]
        .deleteStudent(studentId)
        .signAndSend(alice, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Delete included in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Delete finalized at block ${status.asFinalized}`);

            events.forEach(({ event }) => {
              if (apis.university.events.system.ExtrinsicFailed.is(event)) {
                console.error('Delete failed:', event.data.toString());
              }
            });

            loadStudentsFromChains(apis.university, apis.company, palletName);
            unsub();
          }
        });
    } catch (err) {
      console.error('Error deleting student:', err);
      alert(`Failed to delete student: ${err.message}`);
    }
  };

  const deleteCompanyStudent = async (studentId) => {
    if (!apis.company || !alice || !palletName) {
      alert('Not connected to blockchain');
      return;
    }

    if (!window.confirm('Delete this student from Company parachain?')) {
      return;
    }

    try {
      console.log(`Deleting company student ID ${studentId}...`);

      const unsub = await apis.company.tx[palletName]
        .deleteAnyStudent(studentId)
        .signAndSend(alice, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Company delete included in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Company delete finalized at block ${status.asFinalized}`);

            events.forEach(({ event }) => {
              if (apis.company.events.system.ExtrinsicFailed.is(event)) {
                console.error('Delete failed:', event.data.toString());
              }
            });

            loadStudentsFromChains(
              apis.university,
              apis.company,
              palletName
            );

            unsub();
          }
        });
    } catch (err) {
      console.error('Error deleting company student:', err);
      alert(`Failed to delete student: ${err.message}`);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold mb-2">Connecting to Parachains...</p>
          <div className="space-y-1 text-sm">
            <p className="flex items-center justify-center gap-2">
              {connectionStatus.university === 'connected' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              )}
              University Parachain (1000)
            </p>
            <p className="flex items-center justify-center gap-2">
              {connectionStatus.company === 'connected' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              )}
              Company Parachain (2000)
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Connection Error</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-2">Make sure:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Zombienet is running</li>
              <li>University chain: ws://127.0.0.1:9988</li>
              <li>Company chain: ws://127.0.0.1:9999</li>
              <li>Both chains have the student pallet</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 px-[2vw] py-[2vh]">
      <div className="w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            XCM Student Transfer Visualizer
          </h1>
          <p className="text-gray-600 mb-4">
            University Parachain (1000) → Company Parachain (2000)
          </p>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Connected | Pallet: {palletName} | Alice
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-6 h-6" />
            Create New Student
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Name"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleInputChange}
              placeholder="Surname"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Age"
              min="18"
              max="100"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <button
              onClick={createStudent}
              disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-[clamp(1rem,2vw,2rem)]">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">University Parachain</h2>
                <p className="text-sm text-gray-500">Para ID: 1000 | Port: 9988</p>
              </div>
            </div>

            <div className="space-y-3">
              {universityStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <User className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No students yet. Create one above!</p>
                </div>
              ) : (
                universityStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`border border-gray-200 rounded-lg p-4 transition-all ${
                      transferring === student.id
                        ? 'animate-pulse bg-yellow-50 border-yellow-300'
                        : 'hover:shadow-md'
                    }`}
                  >
                    {editingStudent === student.id ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-gray-800">Edit Student</h3>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditInputChange}
                          placeholder="Name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          name="surname"
                          value={editFormData.surname}
                          onChange={handleEditInputChange}
                          placeholder="Surname"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          name="age"
                          value={editFormData.age}
                          onChange={handleEditInputChange}
                          placeholder="Age"
                          min="18"
                          max="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          name="gender"
                          value={editFormData.gender}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <button
                          onClick={() => updateStudent(student.id)}
                          disabled={updating}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                          {updating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">
                              {student.name} {student.surname}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Age: {student.age} | {student.gender}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              ID: {student.id}
                            </span>
                            <button
                              onClick={() => startEditing(student)}
                              disabled={transferring !== null}
                              title="Edit student"
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStudent(student.id)}
                              disabled={transferring !== null}
                              title="Delete student"
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => graduateStudent(student.id)}
                          disabled={transferring !== null}
                          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {transferring === student.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Graduating & Transferring...
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-4 h-4" />
                              Graduate Student
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Company Parachain</h2>
                <p className="text-sm text-gray-500">Para ID: 2000 | Port: 9999</p>
              </div>
            </div>

            <div className="space-y-3">
              {companyStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No graduated students yet</p>
                </div>
              ) : (
                companyStudents.map((student) => (
                  <div
                    key={student.id}
                    className="border border-gray-200 rounded-lg p-4 bg-green-50 border-green-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">
                          {student.name} {student.surname}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Age: {student.age} | {student.gender}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        ID: {student.id}
                      </span>
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        Graduated
                      </span>
                      <button
                      onClick={() => deleteCompanyStudent(student.id)}
                      title="Delete student"
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition"
                      >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
                ))
              )}
            </div>
          </div>
        </div>

        {transferring !== null && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="animate-ping">
              <ArrowRight className="w-16 h-16 text-green-600" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Create students on University Parachain using the form above</li>
            <li>Edit student details by clicking the edit icon next to each student</li>
            <li>Students are stored on-chain in the {palletName} pallet</li>
            <li>Click "Graduate Student" to trigger the XCM transfer</li>
            <li>Student data is sent via XCM from Para 1000 → Para 2000</li>
            <li>Graduated student appears on Company Parachain automatically</li>
          </ol>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>✅ Live Connection:</strong> Connected to your zombienet nodes. 
              Transactions signed with Alice. Check browser console for detailed logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XCMStudentVisualizer;