require('dotenv').config();
const repository = require('./repositories');
const { classifySeverity } = require('./severity');
const hotspotService = require('./services/hotspotService');
const teamRepository = require('./teamRepository');
const { calculatePriority } = require('./priority');

const sampleIncidentsData = [
  // --- CLUSTER: SV University Campus (3 nearby incidents within ~350m for Hotspot detection) ---
  {
    id: 'INC-DEMO01',
    title: '[TEST] Chemical Lab Fire & Smoke Outbreak',
    description: 'Chemistry department research wing on second floor caught fire. Thick toxic chemical smoke spreading rapidly across classrooms. 4 graduate students stranded in adjacent lab room.',
    category: 'Fire Emergency',
    location: 'SV University Engineering Science Block, Tirupati',
    latitude: 13.6322,
    longitude: 79.4020,
    peopleAffected: 4,
    contactName: 'Prof. K. Ramanathan (Simulated)',
    contactPhone: '+91-9849012345',
    contactEmail: 'k.ramanathan@svuniversity.ac.in',
    peopleTrapped: 'Yes',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    id: 'INC-DEMO02',
    title: '[TEST] Balcony Awning Collapse at Administrative Block',
    description: 'Heavy heritage concrete sunshade collapsed over main entrance stairs. Massive debris blocking doorway. Students report 3 people trapped underneath rubble.',
    category: 'Building Collapse',
    location: 'SV University Administrative Complex, Tirupati',
    latitude: 13.6335,
    longitude: 79.4005,
    peopleAffected: 6,
    contactName: 'Campus Security Officer Murthy (Simulated)',
    contactPhone: '+91-9440054321',
    contactEmail: 'security@svuniversity.edu.in',
    peopleTrapped: 'Yes',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: 'INC-DEMO03',
    title: '[TEST] Student Collapse - Unconscious with Respiratory Distress',
    description: 'College student collapsed outside university central library during afternoon heat. Citizen reports victim is unconscious and not breathing normally. First aid CPR in progress.',
    category: 'Medical Emergency',
    location: 'SVU Central Library Quadrangle, Tirupati',
    latitude: 13.6340,
    longitude: 79.4012,
    peopleAffected: 1,
    contactName: 'Librarian V. Lakshmi (Simulated)',
    contactPhone: '+91-9885067890',
    contactEmail: 'vlakshmi.svu@gmail.com',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },

  // --- SPREAD INCIDENTS ACROSS TIRUPATI & ANDHRA PRADESH REGION ---
  {
    id: 'INC-DEMO04',
    title: '[TEST] Multi-Vehicle Highway Collision at Renigunta Road',
    description: 'Two private buses and an SUV collided near Korlagunta junction. Multiple passengers injured, wreckage completely blocking four-lane highway.',
    category: 'Road Accident',
    location: 'Renigunta Road & Korlagunta Junction, Tirupati',
    latitude: 13.6302,
    longitude: 79.4350,
    peopleAffected: 12,
    contactName: 'Traffic Constable Naidu (Simulated)',
    contactPhone: '+91-9989011223',
    contactEmail: 'traffic.tirupati@appolice.gov.in',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString()
  },
  {
    id: 'INC-DEMO05',
    title: '[TEST] Flash Stream Inundation at Kapilatheertham',
    description: 'Heavy hill runoff from Seshachalam ranges has breached drainage channels. Rising water flooding residential streets along Kapilatheertham temple road.',
    category: 'Flood',
    location: 'Kapilatheertham Temple Approach Road, Tirupati',
    latitude: 13.6492,
    longitude: 79.4150,
    peopleAffected: 8,
    contactName: 'Suresh Reddy (Simulated)',
    contactPhone: '+91-9876543210',
    contactEmail: 'suresh.reddy@example.com',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'Minor',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString()
  },
  {
    id: 'INC-DEMO06',
    title: '[TEST] Commercial LPG Gas Leak near Central Railway Station',
    description: 'High-pressure cylinder line leak at commercial food stall near Station East Gate. Strong gas leak smell spreading into passenger platforms.',
    category: 'Other Emergencies',
    location: 'Tirupati Central Railway Station East Exit, Station Road',
    latitude: 13.6268,
    longitude: 79.4215,
    peopleAffected: 25,
    contactName: 'Station Supervisor Prasad (Simulated)',
    contactPhone: '+91-9441098765',
    contactEmail: 'prasad.rly@scr.railnet.gov.in',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 'INC-DEMO07',
    title: '[TEST] Restaurant Kitchen Fire Contained near RTC Bus Stand',
    description: 'Grease exhaust flue caught fire in hotel kitchen. Fire extinguisher used by staff, thick smoke cleared by emergency ventilation.',
    category: 'Fire Emergency',
    location: 'Bhavani Nagar near RTC Central Bus Station, Tirupati',
    latitude: 13.6241,
    longitude: 79.4248,
    peopleAffected: 2,
    contactName: 'Hotel Manager Srinivas (Simulated)',
    contactPhone: '+91-9848034567',
    contactEmail: 'srinivas.hotel@example.com',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'Minor',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString()
  },
  {
    id: 'INC-DEMO08',
    title: '[TEST] Two-Wheeler Skid Accident on Alipiri Bypass',
    description: 'Motorcyclist slipped on gravel along Alipiri Bypass curve. Rider sustained arm abrasions, conscious and resting roadside.',
    category: 'Road Accident',
    location: 'Alipiri Footpath Gate & Toll Complex, Tirupati',
    latitude: 13.6515,
    longitude: 79.3958,
    peopleAffected: 1,
    contactName: 'Ravi Teja (Simulated)',
    contactPhone: '+91-9701045678',
    contactEmail: 'raviteja.tpt@gmail.com',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'Minor',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString()
  },
  {
    id: 'INC-DEMO09',
    title: '[TEST] Blocked Storm Canal Backing Up near Bairagipatteda',
    description: 'Clogged canal culvert overflowing into colony lane. Pedestrian walkway submerged under 6 inches of rain water.',
    category: 'Flood',
    location: 'Bairagipatteda 3rd Cross Road, Tirupati',
    latitude: 13.6185,
    longitude: 79.4152,
    peopleAffected: 0,
    contactName: 'Colony President Sharma (Simulated)',
    contactPhone: '+91-9440078901',
    contactEmail: 'sharma.resident@example.com',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  },
  {
    id: 'INC-DEMO10',
    title: '[TEST] Fissured Compound Wall near SPMVV Campus',
    description: 'Substantial structural cracks observed along 20-meter boundary retaining wall following continuous rains. Risk of masonry collapse into footpath.',
    category: 'Building Collapse',
    location: 'Sri Padmavathi Mahila Visvavidyalayam (SPMVV) West Wall, Tirupati',
    latitude: 13.6425,
    longitude: 79.3882,
    peopleAffected: 0,
    contactName: 'Estate Officer Anitha (Simulated)',
    contactPhone: '+91-9866099887',
    contactEmail: 'estate.spmvv@andhra.gov.in',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString()
  },
  {
    id: 'INC-DEMO11',
    title: '[TEST] Patient Fainting & Heat Exhaustion in Ruia OP Ward',
    description: 'Elderly attendee fainted in outpatient waiting foyer. Vitals checked and IV fluids administered by duty physician.',
    category: 'Medical Emergency',
    location: 'Ruia Government General Hospital Outpatient Entrance, Tirupati',
    latitude: 13.6385,
    longitude: 79.4085,
    peopleAffected: 1,
    contactName: 'Staff Nurse Geetha (Simulated)',
    contactPhone: '+91-9959066554',
    contactEmail: 'nurse.ruia@ap.gov.in',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: 'INC-DEMO12',
    title: '[TEST] Uprooted Tree Leaning against Electrical Pole',
    description: 'Storm winds caused heavy tamarind tree branch to rest against overhead low-tension power cables. No wires snapped yet.',
    category: 'Other Emergencies',
    location: 'Chandragiri Bypass Road near DRDA Office, Tirupati',
    latitude: 13.6052,
    longitude: 79.3520,
    peopleAffected: 0,
    contactName: 'Lineman Venkatesh (Simulated)',
    contactPhone: '+91-9440011223',
    contactEmail: 'venkat.spdcl@apspdcl.in',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
  }
];

async function seedDatabase() {
  console.log('[RescueGrid Seed] Seeding realistic sample emergency incidents around Tirupati / Andhra Pradesh...');

  const prepared = sampleIncidentsData.map(item => {
    // Run rule-based severity classifier
    const assessment = classifySeverity({
      title: item.title,
      description: item.description,
      category: item.category,
      peopleAffected: item.peopleAffected,
      peopleTrapped: item.peopleTrapped,
      immediateDanger: item.immediateDanger,
      injuries: item.injuries
    });

    const statusHistory = [
      {
        status: 'Reported',
        at: item.createdAt,
        note: 'Incident reported via citizen emergency portal (Sample)'
      }
    ];

    if (item.status === 'Assigned') {
      statusHistory.push({
        status: 'Assigned',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 3).toISOString(),
        note: 'Triaged by Tirupati Municipal Control Room'
      });
    } else if (item.status === 'In Progress') {
      statusHistory.push({
        status: 'Assigned',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 2).toISOString(),
        note: 'Triaged by Tirupati Municipal Control Room'
      });
      statusHistory.push({
        status: 'In Progress',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 8).toISOString(),
        note: 'AP Disaster Response Force (APDRF) unit dispatched'
      });
    } else if (item.status === 'Resolved') {
      statusHistory.push({
        status: 'Assigned',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 2).toISOString(),
        note: 'Response team assigned'
      });
      statusHistory.push({
        status: 'In Progress',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 5).toISOString(),
        note: 'APDRF / Emergency squad on scene'
      });
      statusHistory.push({
        status: 'Resolved',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 30).toISOString(),
        note: 'Hazard neutralized, area cleared and safe'
      });
    }

    const preparedIncident = {
      ...item,
      severity: assessment.level,
      severityScore: assessment.score,
      severityReasons: assessment.reasons,
      severityOverride: null,
      statusHistory,
      isSample: true,
      updatedAt: new Date().toISOString()
    };
    const priority=calculatePriority(preparedIncident);
    return { ...preparedIncident, priorityScore:priority.score, priorityLabel:priority.label, priorityBreakdown:priority.breakdown };
  });

  try {
    const count = await repository.seed(prepared);
    console.log(`[RescueGrid Seed] Successfully inserted ${count} sample incidents.`);

    const teams = [
      ['Fire','North Fire & Rescue'],['Fire','Central Fire Unit'],['Fire','Renigunta Fire Unit'],
      ['Medical','Tirupati Emergency Medical 1'],['Medical','SVU Medical Response'],['Medical','Renigunta Ambulance Unit'],
      ['Rescue','AP Disaster Rescue 1'],['Rescue','Hill Rescue Team'],['Police','Tirupati Police Response'],['Disaster Response','District Disaster Response']
    ].map(([category,name],i)=>({ id:`TEAM-${String(i+1).padStart(3,'0')}`, name, category,
      lat:13.63+([0,.025,-.03,.05,-.045,.075,-.08,.095,-.1,.1][i]), lng:79.42+([-.04,.03,.06,-.02,.045,-.065,.07,-.09,.1,-.1][i]),
      availability:i<2?'Busy':'Available', currentIncidentId:i===0?'INC-DEMO01':i===1?'INC-DEMO04':null, isSample:true, contactLabel:`${category} dispatch` }));
    await teamRepository.seed(teams);
    await repository.update('INC-DEMO01',{assignedTeamId:'TEAM-001',assignedAt:new Date().toISOString()});
    await repository.update('INC-DEMO04',{assignedTeamId:'TEAM-002',assignedAt:new Date().toISOString()});

    // Run hotspot detection over seeded incidents so SV University cluster is registered
    for (const item of prepared) {
      if (item.latitude && item.longitude) {
        await hotspotService.checkHotspots(item);
      }
    }
    console.log('[RescueGrid Seed] Hotspot clustering scan completed for sample incidents.');

    return count;
  } catch (err) {
    console.error('[RescueGrid Seed] Error during seed:', err);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase, sampleIncidentsData };
