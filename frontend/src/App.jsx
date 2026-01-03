import React, { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { ArrowRight, User, GraduationCap, Building2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const XCMStudentVisualizer = () => {
  // API instances for both parachains
  const [apis, setApis] = useState({ university: null, company: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    university: 'disconnected',
    company: 'disconnected'
  });

  // Student data
  const [universityStudents, setUniversityStudents] = useState([]);
  const [companyStudents, setCompanyStudents] = useState([]);

  // Alice account (default dev account)
  const [alice, setAlice] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    age: '',
    gender: 'Male'
  });
  const [creating, setCreating] = useState(false);
  const [transferring, setTransferring] = useState(null);

  // Pallet name detection
  const [palletName, setPalletName] = useState(null);

  // Initialize connections and Alice account
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize keyring and get Alice account
        const keyring = new Keyring({ type: 'sr25519' });
        const aliceAccount = keyring.addFromUri('//Alice');
        setAlice(aliceAccount);

        console.log('Alice address:', aliceAccount.address);

        // Connect to University Parachain (1000) on port 9988
        console.log('Connecting to University Parachain...');
        setConnectionStatus(prev => ({ ...prev, university: 'connecting' }));
        const wsProviderUniversity = new WsProvider('ws://127.0.0.1:9988');
        const apiUniversity = await ApiPromise.create({ provider: wsProviderUniversity });
        await apiUniversity.isReady;
        console.log('✅ Connected to University Parachain');
        setConnectionStatus(prev => ({ ...prev, university: 'connected' }));

        // Connect to Company Parachain (2000) on port 9999
        console.log('Connecting to Company Parachain...');
        setConnectionStatus(prev => ({ ...prev, company: 'connecting' }));
        const wsProviderCompany = new WsProvider('ws://127.0.0.1:9999');
        const apiCompany = await ApiPromise.create({ provider: wsProviderCompany });
        await apiCompany.isReady;
        console.log('✅ Connected to Company Parachain');
        setConnectionStatus(prev => ({ ...prev, company: 'connected' }));

        // Detect pallet name
        const detectedPalletName = detectPalletName(apiUniversity);
        if (!detectedPalletName) {
          throw new Error('Could not find student pallet. Available pallets: ' + 
            Object.keys(apiUniversity.query).join(', '));
        }
        setPalletName(detectedPalletName);
        console.log('✅ Detected pallet name:', detectedPalletName);

        setApis({ university: apiUniversity, company: apiCompany });

        // Load initial student data
        await loadStudentsFromChains(apiUniversity, apiCompany, detectedPalletName);

        setLoading(false);
      } catch (err) {
        console.error('Connection error:', err);
        setError(`Failed to connect: ${err.message}`);
        setLoading(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (apis.university) apis.university.disconnect();
      if (apis.company) apis.company.disconnect();
    };
  }, []);

  // Detect pallet name by checking common variations
  const detectPalletName = (api) => {
    const possibleNames = [
      'templatePallet',      // Your actual pallet name
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

    // If not found, log all available pallets
    console.log('Available pallets:', Object.keys(api.query));
    return null;
  };

  // Load students from both chains
  const loadStudentsFromChains = async (uniApi, compApi, pallet) => {
    try {
      console.log('Loading students using pallet:', pallet);
      
      // Load from University Parachain
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

      // Load from Company Parachain
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

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Create student on University Parachain
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
      // Convert strings to byte arrays
      const nameBytes = Array.from(new TextEncoder().encode(formData.name));
      const surnameBytes = Array.from(new TextEncoder().encode(formData.surname));
      const age = parseInt(formData.age);
      const gender = formData.gender;

      console.log('Creating student:', { nameBytes, surnameBytes, age, gender });
      console.log('Using pallet:', palletName);

      // Submit transaction
      const unsub = await apis.university.tx[palletName]
        .createStudent(nameBytes, surnameBytes, age, gender)
        .signAndSend(alice, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Transaction included in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Transaction finalized at block ${status.asFinalized}`);
            
            // Check for errors
            events.forEach(({ event }) => {
              if (apis.university.events.system.ExtrinsicFailed.is(event)) {
                console.error('Transaction failed:', event.data.toString());
              }
            });

            // Reload students after transaction is finalized
            loadStudentsFromChains(apis.university, apis.company, palletName);
            
            // Reset form
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

  // Graduate student (triggers XCM transfer)
  const graduateStudent = async (studentId) => {
    if (!apis.university || !alice || !palletName) {
      alert('Not connected to blockchain');
      return;
    }

    setTransferring(studentId);

    try {
      console.log(`Graduating student ID ${studentId}...`);

      // Submit graduation transaction
      const unsub = await apis.university.tx[palletName]
        .graduateStudent(studentId)
        .signAndSend(alice, async ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Graduation transaction in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Graduation finalized at block ${status.asFinalized}`);
            
            // Check for events
            events.forEach(({ event }) => {
              console.log('Event:', event.section, event.method, event.data.toString());
              if (apis.university.events.system.ExtrinsicFailed.is(event)) {
                console.error('Transaction failed:', event.data.toString());
              }
            });

            // Wait a bit for XCM to process
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Reload students from both chains
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

  // Loading state
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

  // Error state
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-[2vw] sm:p-[3vw]">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-[3vw]">
          <h1 className="text-[clamp(1.5rem,4vw,3rem)] font-bold text-gray-800 mb-[1vw]">
            XCM Student Transfer Visualizer
          </h1>
          <p className="text-gray-600 text-[clamp(0.875rem,1.5vw,1rem)] mb-[1vw]">
            University Parachain (1000) ⟷ Company Parachain (2000)
          </p>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-[1.5vw] py-[0.75vw] rounded-full text-[clamp(0.75rem,1.2vw,0.875rem)]">
            <CheckCircle className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px]" />
            Connected | Pallet: {palletName} | Alice
          </div>
        </div>

        {/* Create Student Form */}
        <div className="bg-white rounded-lg shadow-lg p-[2vw] mb-[3vw]">
          <h2 className="text-[clamp(1.125rem,2vw,1.5rem)] font-bold text-gray-800 mb-[1.5vw] flex items-center gap-2">
            <User className="w-[2vw] h-[2vw] min-w-[20px] min-h-[20px]" />
            Create New Student
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-[1vw]">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Name"
              className="px-[1.5vw] py-[1vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[clamp(0.875rem,1.2vw,1rem)]"
            />
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleInputChange}
              placeholder="Surname"
              className="px-[1.5vw] py-[1vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[clamp(0.875rem,1.2vw,1rem)]"
            />
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Age"
              min="18"
              max="100"
              className="px-[1.5vw] py-[1vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[clamp(0.875rem,1.2vw,1rem)]"
            />
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="px-[1.5vw] py-[1vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[clamp(0.875rem,1.2vw,1rem)]"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <button
              onClick={createStudent}
              disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-[2vw] py-[1vw] rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[clamp(0.875rem,1.2vw,1rem)] md:col-span-2 xl:col-span-1"
            >
              {creating ? (
                <>
                  <Loader2 className="w-[1.5vw] h-[1.5vw] min-w-[16px] min-h-[16px] animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </button>
          </div>
        </div>

        {/* Parachains Display */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-[2vw] mb-[4vw]">
          {/* University Parachain */}
          <div className="bg-white rounded-lg shadow-lg p-[2vw]">
            <div className="flex items-center gap-[1vw] mb-[2vw]">
              <GraduationCap className="w-[3vw] h-[3vw] min-w-[32px] min-h-[32px] text-blue-600" />
              <div>
                <h2 className="text-[clamp(1.25rem,2.5vw,2rem)] font-bold text-gray-800">University Parachain</h2>
                <p className="text-[clamp(0.75rem,1vw,0.875rem)] text-gray-500">Para ID: 1000 | Port: 9988</p>
              </div>
            </div>

            <div className="space-y-[1vw]">
              {universityStudents.length === 0 ? (
                <div className="text-center py-[5vw] text-gray-400">
                  <User className="w-[5vw] h-[5vw] min-w-[48px] min-h-[48px] mx-auto mb-[1vw] opacity-50" />
                  <p className="text-[clamp(0.875rem,1.2vw,1rem)]">No students yet. Create one above!</p>
                </div>
              ) : (
                universityStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`border border-gray-200 rounded-lg p-[1.5vw] transition-all ${
                      transferring === student.id
                        ? 'animate-pulse bg-yellow-50 border-yellow-300'
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-[1vw]">
                      <div>
                        <h3 className="font-bold text-gray-800 text-[clamp(1rem,1.5vw,1.25rem)]">
                          {student.name} {student.surname}
                        </h3>
                        <p className="text-[clamp(0.75rem,1vw,0.875rem)] text-gray-600">
                          Age: {student.age} | {student.gender}
                        </p>
                      </div>
                      <span className="text-[clamp(0.75rem,1vw,0.875rem)] bg-blue-100 text-blue-800 px-[1vw] py-[0.5vw] rounded whitespace-nowrap">
                        ID: {student.id}
                      </span>
                    </div>
                    <button
                      onClick={() => graduateStudent(student.id)}
                      disabled={transferring !== null}
                      className="w-full mt-[1vw] bg-green-600 hover:bg-green-700 text-white px-[1.5vw] py-[1vw] rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[clamp(0.875rem,1.2vw,1rem)]"
                    >
                      {transferring === student.id ? (
                        <>
                          <Loader2 className="w-[1.5vw] h-[1.5vw] min-w-[16px] min-h-[16px] animate-spin" />
                          Graduating & Transferring...
                        </>
                      ) : (
                        <>
                          <GraduationCap className="w-[1.5vw] h-[1.5vw] min-w-[16px] min-h-[16px]" />
                          Graduate Student
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Company Parachain */}
          <div className="bg-white rounded-lg shadow-lg p-[2vw]">
            <div className="flex items-center gap-[1vw] mb-[2vw]">
              <Building2 className="w-[3vw] h-[3vw] min-w-[32px] min-h-[32px] text-purple-600" />
              <div>
                <h2 className="text-[clamp(1.25rem,2.5vw,2rem)] font-bold text-gray-800">Company Parachain</h2>
                <p className="text-[clamp(0.75rem,1vw,0.875rem)] text-gray-500">Para ID: 2000 | Port: 9999</p>
              </div>
            </div>

            <div className="space-y-[1vw]">
              {companyStudents.length === 0 ? (
                <div className="text-center py-[5vw] text-gray-400">
                  <Building2 className="w-[5vw] h-[5vw] min-w-[48px] min-h-[48px] mx-auto mb-[1vw] opacity-50" />
                  <p className="text-[clamp(0.875rem,1.2vw,1rem)]">No graduated students yet</p>
                </div>
              ) : (
                companyStudents.map((student) => (
                  <div
                    key={student.id}
                    className="border border-gray-200 rounded-lg p-[1.5vw] bg-green-50 border-green-200"
                  >
                    <div className="flex justify-between items-start mb-[0.5vw]">
                      <div>
                        <h3 className="font-bold text-gray-800 text-[clamp(1rem,1.5vw,1.25rem)]">
                          {student.name} {student.surname}
                        </h3>
                        <p className="text-[clamp(0.75rem,1vw,0.875rem)] text-gray-600">
                          Age: {student.age} | {student.gender}
                        </p>
                      </div>
                      <span className="text-[clamp(0.75rem,1vw,0.875rem)] bg-green-600 text-white px-[1vw] py-[0.5vw] rounded flex items-center gap-1 whitespace-nowrap">
                        <GraduationCap className="w-[1.2vw] h-[1.2vw] min-w-[12px] min-h-[12px]" />
                        Graduated
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Transfer Animation Overlay */}
        {transferring !== null && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
            <div className="animate-ping">
              <ArrowRight className="w-[5vw] h-[5vw] min-w-[64px] min-h-[64px] text-green-600" />
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="bg-white rounded-lg shadow-lg p-[2vw]">
          <h3 className="font-bold text-gray-800 mb-[1.5vw] text-[clamp(1.125rem,2vw,1.5rem)]">How it works:</h3>
          <ol className="list-decimal list-inside space-y-[0.75vw] text-gray-600 text-[clamp(0.875rem,1.2vw,1rem)]">
            <li>Create students on University Parachain using the form above</li>
            <li>Students are stored on-chain in the {palletName} pallet</li>
            <li>Click "Graduate Student" to trigger the XCM transfer</li>
            <li>Student data is sent via XCM from Para 1000 → Para 2000</li>
            <li>Graduated student appears on Company Parachain automatically</li>
          </ol>
          <div className="mt-[1.5vw] p-[1.5vw] bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-[clamp(0.75rem,1vw,0.875rem)] text-blue-800">
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