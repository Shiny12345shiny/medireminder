const express = require('express');
const { protect } = require('../middlewares/auth');
const asyncHandler = require('express-async-handler');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Medicine database/information routes
// This is a placeholder for medicine information API
// In production, you might integrate with a medicine database API

// @desc    Search medicines
// @route   GET /api/medicines/search
// @access  Private
const searchMedicines = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    res.status(400);
    throw new Error('Search query must be at least 2 characters');
  }

  // Placeholder response
  // In production, integrate with medicine database API
  const medicines = [
    {
      name: 'Paracetamol 500mg',
      genericName: 'Paracetamol',
      brand: 'Various',
      type: 'tablet',
      commonDosages: ['500mg', '650mg', '1000mg'],
      uses: ['Pain relief', 'Fever reduction']
    },
    {
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      brand: 'Various',
      type: 'tablet',
      commonDosages: ['200mg', '400mg', '600mg'],
      uses: ['Pain relief', 'Anti-inflammatory']
    }
  ].filter(med => 
    med.name.toLowerCase().includes(q.toLowerCase()) ||
    med.genericName.toLowerCase().includes(q.toLowerCase())
  ).slice(0, parseInt(limit));

  res.json({
    success: true,
    count: medicines.length,
    data: medicines,
    message: 'This is sample data. Integrate with a medicine database API for production.'
  });
});

// @desc    Get medicine information
// @route   GET /api/medicines/:id
// @access  Private
const getMedicineInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Placeholder response
  const medicineInfo = {
    id,
    name: 'Paracetamol 500mg',
    genericName: 'Paracetamol',
    brand: 'Tylenol',
    type: 'tablet',
    strength: '500mg',
    description: 'Paracetamol is a pain reliever and fever reducer.',
    uses: ['Pain relief', 'Fever reduction', 'Headache', 'Toothache'],
    dosage: {
      adults: '500-1000mg every 4-6 hours, maximum 4000mg per day',
      children: 'Consult doctor'
    },
    sideEffects: [
      'Nausea',
      'Stomach pain (rare)',
      'Allergic reactions (rare)'
    ],
    warnings: [
      'Do not exceed recommended dose',
      'Avoid alcohol while taking this medication',
      'Consult doctor if symptoms persist'
    ],
    interactions: [
      'Blood thinners',
      'Other pain relievers'
    ],
    storage: 'Store at room temperature away from moisture and heat',
    message: 'This is sample data. Integrate with a medicine database API for production.'
  };

  res.json({
    success: true,
    data: medicineInfo
  });
});

// @desc    Get drug interactions
// @route   POST /api/medicines/interactions
// @access  Private
const checkDrugInteractions = asyncHandler(async (req, res) => {
  const { medicines } = req.body;

  if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
    res.status(400);
    throw new Error('Please provide at least 2 medicines to check interactions');
  }

  // Placeholder response
  const interactions = [
    {
      medicines: [medicines[0], medicines[1]],
      severity: 'moderate',
      description: 'May increase side effects when taken together',
      recommendation: 'Consult your doctor before combining these medications'
    }
  ];

  res.json({
    success: true,
    data: {
      hasInteractions: interactions.length > 0,
      interactions
    },
    message: 'This is sample data. Integrate with a drug interaction API for production.'
  });
});

// @desc    Get medicine alternatives
// @route   GET /api/medicines/:id/alternatives
// @access  Private
const getMedicineAlternatives = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Placeholder response
  const alternatives = [
    {
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      type: 'tablet',
      similarUse: 'Pain relief and fever reduction',
      priceComparison: 'Similar price'
    },
    {
      name: 'Aspirin 500mg',
      genericName: 'Acetylsalicylic acid',
      type: 'tablet',
      similarUse: 'Pain relief',
      priceComparison: 'Lower price'
    }
  ];

  res.json({
    success: true,
    count: alternatives.length,
    data: alternatives,
    message: 'This is sample data. Integrate with a medicine database API for production.'
  });
});

// Validation
const interactionsValidation = [
  body('medicines')
    .isArray({ min: 2 })
    .withMessage('Please provide at least 2 medicines'),
  validate
];

// Routes
router.get('/search', protect, searchMedicines);
router.get('/:id', protect, getMedicineInfo);
router.post('/interactions', protect, interactionsValidation, checkDrugInteractions);
router.get('/:id/alternatives', protect, getMedicineAlternatives);

module.exports = router;