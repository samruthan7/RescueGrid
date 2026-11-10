const repository = require('./repository');
const { classifySeverity } = require('./severity');

const sampleIncidentsData = [
  {
    id: 'INC-DEMO01',
    title: '[TEST] Multi-Story Warehouse Structural Fire',
    description: 'Industrial warehouse on 4th Avenue engulfed in flames. Thick black smoke spreading across nearby residential streets. 4 warehouse staff stranded near loading bay.',
    category: 'Fire Emergency',
    location: '442 Industrial Parkway, Sector 8',
    latitude: 37.7749,
    longitude: -122.4194,
    peopleAffected: 4,
    contactName: 'Officer Miller (Simulated)',
    contactPhone: '+1-555-0192',
    contactEmail: 'miller.test@cityops.gov',
    peopleTrapped: 'Yes',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() // 18 mins ago
  },
  {
    id: 'INC-DEMO02',
    title: '[TEST] Partial Commercial Plaza Awning Collapse',
    description: 'Heavy concrete awning collapsed above entrance of shopping plaza. Rubble is blocking entrance. Bystanders report people trapped underneath debris.',
    category: 'Building Collapse',
    location: 'Central Plaza Mall, North Gate, Grand Ave',
    latitude: 37.7833,
    longitude: -122.4167,
    peopleAffected: 6,
    contactName: 'Sarah Jenkins (Simulated)',
    contactPhone: '+1-555-0143',
    contactEmail: 'sjenkins.test@example.com',
    peopleTrapped: 'Yes',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString() // 7 mins ago
  },
  {
    id: 'INC-DEMO03',
    title: '[TEST] Subway Station Cardiac Arrest - Unconscious Passenger',
    description: 'Passenger collapsed near turnstile ticket counter. Citizen reports victim is unconscious and not breathing. CPR initiated by bystander.',
    category: 'Medical Emergency',
    location: 'Metro Station Metro Level 2, 8th & Market',
    latitude: 37.7795,
    longitude: -122.4137,
    peopleAffected: 1,
    contactName: 'Transit Guard Evans (Simulated)',
    contactPhone: '+1-555-0188',
    contactEmail: 'guard.evans@transit.gov',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'Pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: 'INC-DEMO04',
    title: '[TEST] High-Speed Highway Multi-Vehicle Pileup',
    description: '3 sedans and a delivery van collided during sudden fog. Several motorists injured and roadway completely blocked across both lanes.',
    category: 'Road Accident',
    location: 'Interstate Highway 101 Northbound, Exit 43B',
    latitude: 37.7612,
    longitude: -122.4021,
    peopleAffected: 5,
    contactName: 'David Lee (Simulated)',
    contactPhone: '+1-555-0155',
    contactEmail: 'dlee.test@example.com',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'Serious',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString()
  },
  {
    id: 'INC-DEMO05',
    title: '[TEST] Flash River Surge Threatening Riverside Cottages',
    description: 'Torrential downpour has caused river banks to swell. Rapidly rising water has submerged driveways and is reaching lower residential floor levels.',
    category: 'Flood',
    location: 'Creek Road & Riverview Terrace',
    latitude: 37.7554,
    longitude: -122.4287,
    peopleAffected: 8,
    contactName: 'Elena Rostova (Simulated)',
    contactPhone: '+1-555-0167',
    contactEmail: 'erostova@example.org',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'Minor',
    status: 'Pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString()
  },
  {
    id: 'INC-DEMO06',
    title: '[TEST] Industrial Gas Leak Smell Near School Playground',
    description: 'Strong, persistent sulfur/gas leak odor detected coming from adjacent pipeline maintenance valve near school perimeter.',
    category: 'Other Emergencies',
    location: 'Elmwood Primary School Perimeter, 12 Oak Street',
    latitude: 37.7689,
    longitude: -122.4412,
    peopleAffected: 30,
    contactName: 'Principal Vance (Simulated)',
    contactPhone: '+1-555-0111',
    contactEmail: 'pvance.test@schoolops.org',
    peopleTrapped: 'No',
    immediateDanger: 'Yes',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 'INC-DEMO07',
    title: '[TEST] Kitchen Grease Fire Contained in Restaurant',
    description: 'Small exhaust hood grease fire broke out during lunch rush. Staff extinguished bulk with dry powder, but heavy smoke remains throughout kitchen.',
    category: 'Fire Emergency',
    location: 'Bistro 44, 44 Market Square',
    latitude: 37.7915,
    longitude: -122.3999,
    peopleAffected: 2,
    contactName: 'Chef Marco (Simulated)',
    contactPhone: '+1-555-0134',
    contactEmail: 'marco.kitchen@example.com',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'Minor',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString()
  },
  {
    id: 'INC-DEMO08',
    title: '[TEST] Fender Bender Collision in Mall Parking Lot',
    description: 'Slow speed rear-end collision between two cars leaving parking structure. Minor bumper dent, passenger complaining of wrist sprain.',
    category: 'Road Accident',
    location: 'Westfield Mall Lower Parking B3',
    latitude: 37.7842,
    longitude: -122.4075,
    peopleAffected: 2,
    contactName: 'Chloe Bennett (Simulated)',
    contactPhone: '+1-555-0178',
    contactEmail: 'cbennett@example.com',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'Minor',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString()
  },
  {
    id: 'INC-DEMO09',
    title: '[TEST] Overflowing Storm Drain Backed Up On Hillside',
    description: 'Municipal storm drain clogged with fallen autumn leaves and mud. Water pooling across sidewalk, pedestrian walkway partially submerged.',
    category: 'Flood',
    location: 'Crestview Blvd & Highlands Way',
    latitude: 37.7441,
    longitude: -122.4439,
    peopleAffected: 0,
    contactName: 'Marcus Wright (Simulated)',
    contactPhone: '',
    contactEmail: '',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  },
  {
    id: 'INC-DEMO10',
    title: '[TEST] Cracking Brickwork on Aging Vacant Facade',
    description: 'Noticed significant hairline cracks and loose decorative masonry along upper parapet of abandoned brick commercial building.',
    category: 'Building Collapse',
    location: 'Old Port District, Warehouse #14',
    latitude: 37.7711,
    longitude: -122.3892,
    peopleAffected: 0,
    contactName: 'Building Inspector Roy (Simulated)',
    contactPhone: '+1-555-0199',
    contactEmail: 'r.inspector@city.gov',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString()
  },
  {
    id: 'INC-DEMO11',
    title: '[TEST] Faint in Community Library Reading Room',
    description: 'Student felt dizzy and fainted due to dehydration. Conscious now, drinking water and resting with staff.',
    category: 'Medical Emergency',
    location: 'Civic Center Library, 2nd Floor Study Hall',
    latitude: 37.7788,
    longitude: -122.4172,
    peopleAffected: 1,
    contactName: 'Librarian Davis (Simulated)',
    contactPhone: '+1-555-0122',
    contactEmail: 'davis.lib@cityops.gov',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: 'INC-DEMO12',
    title: '[TEST] Fallen Traffic Signal Pole In Median',
    description: 'High winds snapped mounting bolts of pedestrian signal pole. Pole is resting safely across lawn median, not obstructing traffic lane.',
    category: 'Other Emergencies',
    location: 'Pine Street & 5th Avenue Crosswalk',
    latitude: 37.7922,
    longitude: -122.4044,
    peopleAffected: 0,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    peopleTrapped: 'No',
    immediateDanger: 'No',
    injuries: 'None',
    status: 'Reported',
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
  }
];

function seedDatabase() {
  console.log('[RescueGrid Seed] Seeding test emergency incidents...');

  const prepared = sampleIncidentsData.map(item => {
    // Run real classification logic to ensure 100% consistency with severity rules
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

    if (item.status === 'Pending') {
      statusHistory.push({
        status: 'Pending',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 3).toISOString(),
        note: 'Triaged by Dispatch Control, awaiting crew assignment'
      });
    } else if (item.status === 'In Progress') {
      statusHistory.push({
        status: 'Pending',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 2).toISOString(),
        note: 'Triaged by Dispatch Control'
      });
      statusHistory.push({
        status: 'In Progress',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 8).toISOString(),
        note: 'First responder unit dispatched to coordinates'
      });
    } else if (item.status === 'Resolved') {
      statusHistory.push({
        status: 'In Progress',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 5).toISOString(),
        note: 'Response unit on scene'
      });
      statusHistory.push({
        status: 'Resolved',
        at: new Date(new Date(item.createdAt).getTime() + 1000 * 60 * 30).toISOString(),
        note: 'Scene cleared, medical check completed, hazard neutralized'
      });
    }

    return {
      ...item,
      severity: assessment.level,
      severityScore: assessment.score,
      severityReasons: assessment.reasons,
      severityOverride: null,
      statusHistory,
      updatedAt: new Date().toISOString()
    };
  });

  const count = repository.seed(prepared);
  console.log(`[RescueGrid Seed] Successfully inserted ${count} sample incidents into backend/data/incidents.json.`);
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
