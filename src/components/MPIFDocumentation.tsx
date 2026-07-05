import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  FileText, 
  Package, 
  Beaker, 
  Settings, 
  Database,
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MPIFVariable {
  name: string;
  description: string;
  dataType: string;
  example: string;
  note?: string;
  conditional?: boolean;
  conditionText?: string;
}

interface MPIFSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
  variables: MPIFVariable[];
}

const mpifSections: MPIFSection[] = [
  {
    id: 'metadata',
    title: 'Global Information & Metadata',
    icon: FileText,
    description: 'File metadata, creation information, and author details',
    variables: [
      {
        name: 'data_*',
        description: 'Data block header for the MPIF file',
        dataType: 'string pattern: data_{product_name}_{creation_date}_{author_name}',
        example: 'data_Example-Mat-1_20231027_John-Doe'
      },
      {
        name: '_mpif_audit_creation_date',
        description: 'Date of the file creation',
        dataType: 'string in ISO 8601 format (YYYY-MM-DD)',
        example: '2023-10-27'
      },
      {
        name: '_mpif_audit_generator_version',
        description: 'Version of the generator application that created the file.',
        dataType: 'string',
        example: '1.1',
        note: 'This value is added automatically by the application based on its current version and does not need to be set by the user.'
      },
      {
        name: '_mpif_audit_publication_doi',
        description: 'DOI of the associated publication',
        dataType: 'string',
        example: '10.1038/s41557-025-01777-0'
      },
      {
        name: '_mpif_audit_procedure_status',
        description: 'Classification of the synthetic procedure outcome',
        dataType: 'string from {test, success, failure}',
        example: 'success'
      },
      {
        name: '_mpif_audit_contact_author_name',
        description: 'Name of the responsible author',
        dataType: 'string',
        example: 'John Doe'
      },
      {
        name: '_mpif_audit_contact_author_email',
        description: 'Email address of the responsible author',
        dataType: 'string',
        example: 'john.doe@example.com'
      },
      {
        name: '_mpif_audit_contact_author_id_orcid',
        description: 'ORCID identifier of the responsible author',
        dataType: 'string',
        example: '0000-0000-0000-0000'
      },
      {
        name: '_mpif_audit_contact_author_address',
        description: 'Business address of the responsible author',
        dataType: 'string',
        example: 'Example University, 123 University St, Example City'
      },
      {
        name: '_mpif_audit_contact_author_phone',
        description: 'Phone number of the responsible author',
        dataType: 'string',
        example: '? (optional)'
      }
    ]
  },
  {
    id: 'product',
    title: 'Product Information',
    icon: Package,
    description: 'Material properties, chemical composition, and handling information',
    variables: [
      {
        name: '_mpif_product_type',
        description: 'Type of product synthesized',
        dataType: 'string from {porous framework material, inorganic, organic, composite, other}',
        example: 'porous framework material'
      },
      {
        name: '_mpif_product_cas',
        description: 'CAS registry number of the product',
        dataType: 'string',
        example: '? (if unknown)'
      },
      {
        name: '_mpif_product_ccdc',
        description: 'CCDC repository number of the product',
        dataType: 'string',
        example: '2321951'
      },
      {
        name: '_mpif_product_name_common',
        description: 'Common name of the product',
        dataType: 'string',
        example: 'WaaF-1'
      },
      {
        name: '_mpif_product_name_systematic',
        description: 'Systematic IUPAC name of the product',
        dataType: 'string',
        example: '(optional)'
      },
      {
        name: '_mpif_product_formula',
        description: 'Chemical formula of the product',
        dataType: 'string',
        example: 'C30 N2 Rh2'
      },
      {
        name: '_mpif_product_formula_weight',
        description: 'Molecular weight of the product',
        dataType: 'float (g/mol)',
        example: '1200.24'
      },
      {
        name: '_mpif_product_state',
        description: 'Physical state of the product at room temperature',
        dataType: 'string from {solid, liquid, gas, suspension, other}',
        example: 'solid'
      },
      {
        name: '_mpif_product_color',
        description: 'Color of the product (can be hex code or description)',
        dataType: 'string',
        example: '#6891b1 or "blue"'
      },
      {
        name: '_mpif_product_handling_atmosphere',
        description: 'Recommended atmosphere for handling the product',
        dataType: 'string from {air, inert, water-free, oxygen-free, other}',
        example: 'air'
      },
      {
        name: '_mpif_product_handling_note',
        description: 'Special notes for handling the product safely',
        dataType: 'multi-line string',
        example: 'This compound is highly stable in air. Avoid acidic conditions.'
      },
      {
        name: '_mpif_product_cif',
        description: 'Embedded CIF (Crystallographic Information File) data',
        dataType: 'multi-line string',
        example: '(CIF file content)'
      }
    ]
  },
  {
    id: 'synthesis-general',
    title: 'Synthesis General Information',
    icon: Beaker,
    description: 'Overall reaction conditions, parameters, and environmental factors',
    variables: [
      {
        name: '_mpif_synthesis_performed_date',
        description: 'Date when the synthesis was performed',
        dataType: 'string in ISO 8601 format (YYYY-MM-DD)',
        example: '2025-02-14'
      },
      {
        name: '_mpif_synthesis_lab_temperature_C',
        description: 'Laboratory temperature during synthesis',
        dataType: 'float (°C)',
        example: '21'
      },
      {
        name: '_mpif_synthesis_lab_humidity_percent',
        description: 'Laboratory relative humidity during synthesis',
        dataType: 'float (%)',
        example: '24'
      },
      {
        name: '_mpif_synthesis_type',
        description: 'Type of synthetic procedure used',
        dataType: 'string from {mix, diffusion, evaporation, microwave, mechanochemical, electrochemical, sonochemical, photochemical, flow, other}',
        example: 'mix',
        note: 'Additional variables appear depending on this parameter'
      },
      {
        name: '_mpif_synthesis_react_evap_method',
        description: 'Method of evaporation used',
        dataType: 'string from {ambient, reduced_pressure, spray_drying, other}',
        example: 'ambient',
        conditional: true,
        conditionText: 'Only when synthesis_type = "evaporation"'
      },
      {
        name: '_mpif_synthesis_react_microwave_power_W',
        description: 'Microwave power in Watts',
        dataType: 'float (W)',
        example: '100',
        conditional: true,
        conditionText: 'Only when synthesis_type = "microwave"'
      },
      {
        name: '_mpif_synthesis_react_mechanochem_method',
        description: 'Mechanochemical method used',
        dataType: 'string from {ball_milling, grinding, screw_extruder, other}',
        example: 'ball_milling',
        conditional: true,
        conditionText: 'Only when synthesis_type = "mechanochemical"'
      },
      {
        name: '_mpif_synthesis_react_electrochem_cathode',
        description: 'Cathode material for electrochemical synthesis',
        dataType: 'string',
        example: 'Pt',
        conditional: true,
        conditionText: 'Only when synthesis_type = "electrochemical"'
      },
      {
        name: '_mpif_synthesis_react_electrochem_anode',
        description: 'Anode material for electrochemical synthesis',
        dataType: 'string',
        example: 'Pt',
        conditional: true,
        conditionText: 'Only when synthesis_type = "electrochemical"'
      },
      {
        name: '_mpif_synthesis_react_electrochem_reference',
        description: 'Reference electrode for electrochemical synthesis',
        dataType: 'string',
        example: 'SHE',
        conditional: true,
        conditionText: 'Only when synthesis_type = "electrochemical"'
      },
      {
        name: '_mpif_synthesis_react_electrochem_voltage_V',
        description: 'Applied voltage for electrochemical synthesis',
        dataType: 'float (V)',
        example: '10',
        conditional: true,
        conditionText: 'Only when synthesis_type = "electrochemical"'
      },
      {
        name: '_mpif_synthesis_react_electrochem_current_A',
        description: 'Applied current for electrochemical synthesis',
        dataType: 'float (A)',
        example: '0.5',
        conditional: true,
        conditionText: 'Only when synthesis_type = "electrochemical"'
      },
      {
        name: '_mpif_synthesis_react_sonication_method',
        description: 'Sonication device used',
        dataType: 'string from {ultrasonic_bath, ultrasonic_probe, other}',
        example: 'ultrasonic_probe',
        conditional: true,
        conditionText: 'Only when synthesis_type = "sonochemical"'
      },
      {
        name: '_mpif_synthesis_react_sonication_power',
        description: 'Sonication power',
        dataType: 'float',
        example: '10',
        conditional: true,
        conditionText: 'Only when synthesis_type = "sonochemical"'
      },
      {
        name: '_mpif_synthesis_react_sonication_power_unit',
        description: 'Unit for sonication power',
        dataType: 'string from {W, kHz}',
        example: 'W',
        conditional: true,
        conditionText: 'Only when synthesis_type = "sonochemical"'
      },
      {
        name: '_mpif_synthesis_react_photochemical_wavelength_nm',
        description: 'Wavelength of light used in photochemical synthesis',
        dataType: 'float (nm)',
        example: '235',
        conditional: true,
        conditionText: 'Only when synthesis_type = "photochemical"'
      },
      {
        name: '_mpif_synthesis_react_photochemical_power_W',
        description: 'Power of light source in photochemical synthesis',
        dataType: 'float (W)',
        example: '100',
        conditional: true,
        conditionText: 'Only when synthesis_type = "photochemical"'
      },
      {
        name: '_mpif_synthesis_react_photochemical_source',
        description: 'Light source device used in photochemical synthesis',
        dataType: 'string',
        example: 'Hg lamp',
        conditional: true,
        conditionText: 'Only when synthesis_type = "photochemical"'
      },
      {
        name: '_mpif_synthesis_react_temperature_C',
        description: 'Reaction temperature',
        dataType: 'float (°C)',
        example: '100'
      },
      {
        name: '_mpif_synthesis_react_temperature_controller',
        description: 'Method of controlling reaction temperature',
        dataType: 'string from {ambient, oven, oil_bath, water_bath, dry_bath, hot_plate, microwave, furnace, other}',
        example: 'oven'
      },
      {
        name: '_mpif_synthesis_react_time',
        description: 'Duration of the reaction',
        dataType: 'float',
        example: '16'
      },
      {
        name: '_mpif_synthesis_react_time_unit',
        description: 'Unit for reaction time',
        dataType: 'string from {s, min, h, days}',
        example: 'h'
      },
      {
        name: '_mpif_synthesis_react_atmosphere',
        description: 'Atmosphere under which the reaction was performed',
        dataType: 'string from {air, dry, inert, vacuum, other}',
        example: 'air'
      },
      {
        name: '_mpif_synthesis_react_container',
        description: 'Type of container used for the reaction',
        dataType: 'string',
        example: 'glass vial'
      },
      {
        name: '_mpif_synthesis_react_note',
        description: 'Special notes about the reaction conditions',
        dataType: 'multi-line string',
        example: 'Any heating method other than oven can be used. Reaction is scalable up to 1 g.'
      },
      {
        name: '_mpif_synthesis_product_amount',
        description: 'Amount of product obtained',
        dataType: 'float',
        example: '100'
      },
      {
        name: '_mpif_synthesis_product_amount_unit',
        description: 'Unit for product amount',
        dataType: 'string from {mg, g, kg, μL, mL, L}',
        example: 'mg'
      },
      {
        name: '_mpif_synthesis_product_yield_percent',
        description: 'Yield of the product as a percentage',
        dataType: 'float (%)',
        example: '85'
      },
      {
        name: '_mpif_synthesis_scale',
        description: 'Scale of the synthesis',
        dataType: 'string from {milligram, gram, multigram, kilogram}',
        example: 'milligram'
      },
      {
        name: '_mpif_synthesis_safety_note',
        description: 'Safety considerations and warnings for the synthesis',
        dataType: 'multi-line string',
        example: 'Compound A is toxic. Compound B is highly flammable!'
      }
    ]
  },
  {
    id: 'synthesis-details',
    title: 'Synthesis Procedure Details',
    icon: Settings,
    description: 'Detailed information about reagents, equipment, vessels, and step-by-step procedures',
    variables: [
      {
        name: '_mpif_substrate_number',
        description: 'Number of substrates used in the synthesis',
        dataType: 'integer',
        example: '2'
      },
      {
        name: '_mpif_substrate_id',
        description: 'Identification code for each substrate',
        dataType: 'string (R1, R2, R3, ...)',
        example: 'R1',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_name',
        description: 'Chemical name of the substrate',
        dataType: 'string',
        example: 'metal salt',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_molarity',
        description: 'Molar amount of the substrate',
        dataType: 'float',
        example: '1',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_molarity_unit',
        description: 'Unit for substrate molarity',
        dataType: 'string from {μmol, mmol, mol, kmol}',
        example: 'mmol',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_amount',
        description: 'Mass or volume of the substrate used',
        dataType: 'float',
        example: '10',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_amount_unit',
        description: 'Unit for substrate amount',
        dataType: 'string from {mg, g, kg, μL, mL, L}',
        example: 'mg',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_supplier',
        description: 'Commercial supplier of the substrate',
        dataType: 'string',
        example: 'Sigma Aldrich',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_purity_percent',
        description: 'Purity of the substrate as stated by supplier',
        dataType: 'float (%)',
        example: '98',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_cas',
        description: 'CAS registry number of the substrate',
        dataType: 'string',
        example: '1234-56-7',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_substrate_smiles',
        description: 'SMILES notation of the substrate chemical structure',
        dataType: 'string',
        example: 'CC(C)C',
        note: 'Part of loop structure. Used when substrate cannot be uniquely identified by other information'
      },
      {
        name: '_mpif_solvent_number',
        description: 'Number of solvents used in the synthesis',
        dataType: 'integer',
        example: '2'
      },
      {
        name: '_mpif_solvent_*',
        description: 'Solvent properties (similar structure to substrates)',
        dataType: 'Various (same fields as substrates)',
        example: 'S1, methanol, 1.0, mol, 100, mL, TCI, 98, 67-56-1',
        note: 'Follows the same loop structure as substrates with _mpif_solvent_ prefix'
      },
      {
        name: '_mpif_catalyst_number',
        description: 'Number of catalysts used in the synthesis',
        dataType: 'integer',
        example: '1'
      },
      {
        name: '_mpif_catalyst_id',
        description: 'Identification code for each catalyst',
        dataType: 'string (C1, C2, C3, ...)',
        example: 'C1',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_name',
        description: 'Chemical name of the catalyst',
        dataType: 'string',
        example: 'Pd/C',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_amount',
        description: 'Amount of the catalyst used',
        dataType: 'float',
        example: '10',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_unit',
        description: 'Unit for catalyst amount',
        dataType: 'string',
        example: 'mg, wt%',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_supplier',
        description: 'Commercial supplier of the catalyst',
        dataType: 'string',
        example: 'Sigma-Aldrich',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_purity_percent',
        description: 'Purity of the catalyst as stated by supplier',
        dataType: 'float',
        example: '99',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_cas',
        description: 'CAS registry number of the catalyst',
        dataType: 'string',
        example: '7440-05-3',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_catalyst_smiles',
        description: 'SMILES notation of the catalyst chemical structure',
        dataType: 'string',
        example: '?',
        note: 'Part of loop structure. Used when catalyst cannot be uniquely identified by other information'
      },
      {
        name: '_mpif_catalyst_note',
        description: 'Additional notes about the catalyst',
        dataType: 'string',
        example: '5 mol% loading',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_number',
        description: 'Number of vessels used in the synthesis',
        dataType: 'integer',
        example: '2'
      },
      {
        name: '_mpif_vessel_id',
        description: 'Identification code for each vessel',
        dataType: 'string (V1, V2, V3, ...)',
        example: 'V1',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_volume',
        description: 'Volume capacity of the vessel',
        dataType: 'float',
        example: '50',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_volume_unit',
        description: 'Unit for vessel volume',
        dataType: 'string from {μL, mL, L}',
        example: 'mL',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_material',
        description: 'Material composition of the vessel',
        dataType: 'string',
        example: 'PP (polypropylene), glass',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_type',
        description: 'Type/shape of the vessel',
        dataType: 'string from {vial, jar, autoclave, beaker, flask, centrifugation_tube, other}',
        example: 'centrifugation_tube',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_supplier',
        description: 'Supplier of the vessel',
        dataType: 'string',
        example: 'VWR',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_purpose',
        description: 'Purpose of the vessel in the synthesis',
        dataType: 'string from {storing, reaction, other}',
        example: 'reaction',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_vessel_note',
        description: 'Special notes about the vessel',
        dataType: 'string',
        example: 'This can be substituted with any glass vessel',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_hardware_number',
        description: 'Number of hardware/equipment items used',
        dataType: 'integer',
        example: '3'
      },
      {
        name: '_mpif_hardware_id',
        description: 'Identification code for each hardware item',
        dataType: 'string (H1, H2, H3, ...)',
        example: 'H1',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_hardware_purpose',
        description: 'Purpose/function of the hardware',
        dataType: 'string from {heating/cooling, atmosphere_control, stirring/mixing, synthesis_device, transferring, separation, drying, other}',
        example: 'stirring/mixing',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_hardware_general_name',
        description: 'General/common name of the hardware',
        dataType: 'string',
        example: 'ultrasonic bath',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_hardware_product_name',
        description: 'Specific product/model name of the hardware',
        dataType: 'string',
        example: 'YDH12',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_hardware_supplier',
        description: 'Manufacturer/supplier of the hardware',
        dataType: 'string',
        example: 'Merck',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_hardware_note',
        description: 'Additional notes about the hardware',
        dataType: 'string',
        example: 'Used at maximum power setting',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_procedure_number',
        description: 'Number of procedure steps',
        dataType: 'integer',
        example: '7'
      },
      {
        name: '_mpif_procedure_id',
        description: 'Identification code for each procedure step',
        dataType: 'string (P1, P2, P3, ...)',
        example: 'P1',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_procedure_type',
        description: 'Category of the procedure step',
        dataType: 'string from {preparation, reaction, work-up}',
        example: 'preparation',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_procedure_atmosphere',
        description: 'Atmosphere during the procedure step',
        dataType: 'string from {air, dry, inert, vacuum, other}',
        example: 'air',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_procedure_detail',
        description: 'Detailed description of the procedure step',
        dataType: 'string',
        example: 'Add the reagent R1 and solvent S1 in the vessel V1.',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_procedure_full',
        description: 'Complete detailed procedure description',
        dataType: 'multi-line string',
        example: 'Add the metal salt 10 mg (1 mmol) and methanol 100 mL in the 50 mL PP tube. Sonicate the mixture until dissolution...'
      }
    ]
  },
  {
    id: 'characterization',
    title: 'Characterization Data',
    icon: Database,
    description: 'Analytical data including PXRD, TGA, adsorption/desorption isotherms, and embedded files',
    variables: [
      {
        name: '_mpif_pxrd_data',
        description: 'Data block header for embedded powder X-ray diffraction data',
        dataType: 'data block identifier',
        example: 'data_pxrd'
      },
      {
        name: '_pxrd_source',
        description: 'X-ray source used for PXRD measurement',
        dataType: 'string from {Cu, Cr, Fe, Co, Mo, Ag, synchrotron, other}',
        example: 'Cu'
      },
      {
        name: '_pxrd_lambda',
        description: 'X-ray wavelength used for PXRD',
        dataType: 'float (Å) - Standard values: Cu=1.54056, Cr=2.28970, Fe=1.93604, Co=1.78896, Mo=0.70930, Ag=0.70930',
        example: '1.54056'
      },
      {
        name: '_pxrd_2theta',
        description: '2θ angle values for PXRD pattern',
        dataType: 'float (degrees)',
        example: '5.2, 10.4, 15.6, ...',
        note: 'Part of loop structure'
      },
      {
        name: '_pxrd_intensity',
        description: 'Intensity values for PXRD pattern',
        dataType: 'float (counts)',
        example: '35584, 12043, 8756, ...',
        note: 'Part of loop structure'
      },
      {
        name: '_mpif_tga_data',
        description: 'Data block header for embedded thermogravimetric analysis data',
        dataType: 'data block identifier',
        example: 'data_tga'
      },
      {
        name: '_tga_temperature_celcius',
        description: 'Temperature values for TGA measurement',
        dataType: 'float (°C)',
        example: '31.281, 45.6, 78.9, ...',
        note: 'Part of loop structure'
      },
      {
        name: '_tga_weight_percent',
        description: 'Weight percentage values for TGA measurement',
        dataType: 'float (%)',
        example: '100.0, 98.5, 95.2, ...',
        note: 'Part of loop structure'
      },
      {
        name: '_adsorp_pressure',
        description: 'Pressure values for gas adsorption isotherm',
        dataType: 'float (pressure units)',
        example: '0.001, 0.01, 0.1, ...',
        note: 'Part of loop structure for adsorption data'
      },
      {
        name: '_adsorp_p0',
        description: 'Saturation pressure for gas adsorption isotherm',
        dataType: 'float (pressure units)',
        example: '1.0',
        note: 'Part of loop structure for adsorption data'
      },
      {
        name: '_adsorp_amount',
        description: 'Amount adsorbed at each pressure point',
        dataType: 'float (amount units)',
        example: '10.5, 25.8, 45.2, ...',
        note: 'Part of loop structure for adsorption data'
      },
      {
        name: '_desorp_pressure',
        description: 'Pressure values for gas desorption isotherm',
        dataType: 'float (pressure units)',
        example: '0.9, 0.5, 0.1, ...',
        note: 'Part of loop structure for desorption data'
      },
      {
        name: '_desorp_p0',
        description: 'Saturation pressure for gas desorption isotherm',
        dataType: 'float (pressure units)',
        example: '1.0',
        note: 'Part of loop structure for desorption data'
      },
      {
        name: '_desorp_amount',
        description: 'Amount desorbed at each pressure point',
        dataType: 'float (amount units)',
        example: '42.1, 28.5, 8.9, ...',
        note: 'Part of loop structure for desorption data'
      },
      {
        name: '_exptl_temperature',
        description: 'Experimental temperature for adsorption/desorption measurements',
        dataType: 'float (K or °C)',
        example: '77.35'
      },
      {
        name: '_exptl_method',
        description: 'Experimental method used for adsorption measurements',
        dataType: 'string',
        example: 'volumetric'
      },
      {
        name: '_adsnt_sample_mass',
        description: 'Mass of sample used in adsorption measurement',
        dataType: 'float (mass units)',
        example: '0.0523'
      },
      {
        name: '_adsnt_sample_id',
        description: 'Identification code for the sample',
        dataType: 'string',
        example: 'S1'
      },
      {
        name: '_adsnt_material_id',
        description: 'Identification code for the material',
        dataType: 'string',
        example: 'WaaF-1'
      },
      {
        name: '_units_temperature',
        description: 'Unit for temperature measurements',
        dataType: 'string',
        example: 'K'
      },
      {
        name: '_units_pressure',
        description: 'Unit for pressure measurements',
        dataType: 'string',
        example: 'bar'
      },
      {
        name: '_units_mass',
        description: 'Unit for mass measurements',
        dataType: 'string',
        example: 'g'
      },
      {
        name: '_units_loading',
        description: 'Unit for gas loading/amount measurements',
        dataType: 'string',
        example: 'mol/kg'
      },
      {
        name: '_mpif_aif',
        description: 'Embedded AIF (Adsorption Information File) data',
        dataType: 'multi-line string',
        example: '(Complete AIF file content embedded as text block)'
      },
      {
        name: '_mpif_cif',
        description: 'Embedded CIF (Crystallographic Information File) data',
        dataType: 'multi-line string',
        example: '(Complete CIF file content embedded as text block)'
      }
    ]
  }
];

export function MPIFDocumentation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metadata']));
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleVariable = (variableName: string) => {
    const newExpanded = new Set(expandedVariables);
    if (newExpanded.has(variableName)) {
      newExpanded.delete(variableName);
    } else {
      newExpanded.add(variableName);
    }
    setExpandedVariables(newExpanded);
  };

  const filteredSections = mpifSections.map(section => ({
    ...section,
    variables: section.variables.filter(variable => 
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.dataType.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.variables.length > 0 || searchTerm === '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">MPIF Documentation</h1>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <p className="text-gray-600 mt-2">
            Comprehensive reference for all MPIF (Material Processing Information File) variables and their usage.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Introduction */}
        <Card className="mb-8 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">About MPIF Format</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-blue-800">
            <p className="mb-4">
              The MPIF (Material Processing Information File) format is designed to capture comprehensive information 
              about material synthesis procedures, including experimental conditions, reagents, equipment, and characterization data.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Key Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Structured data format for reproducible synthesis</li>
                  <li>Embedded characterization data (PXRD, TGA, adsorption)</li>
                  <li>Detailed reagent and equipment information</li>
                  <li>Step-by-step procedure documentation</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Data Sections:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Metadata and author information</li>
                  <li>Product properties and composition</li>
                  <li>Synthesis conditions and parameters</li>
                  <li>Detailed procedures and equipment</li>
                  <li>Analytical characterization data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {filteredSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <SectionIcon className="h-6 w-6 text-blue-600" />
                      <div>
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                        <CardDescription className="mt-1">{section.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {section.variables.length} variables
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="border-t bg-gray-50/50">
                    <div className="space-y-3">
                      {section.variables.map((variable) => {
                        const isVariableExpanded = expandedVariables.has(variable.name);
                        
                        return (
                          <div key={variable.name} className="border rounded-lg bg-white">
                            <div
                              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleVariable(variable.name)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {variable.name}
                                    </code>
                                    {variable.conditional && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                        Conditional
                                      </span>
                                    )}
                                    {variable.note?.includes('loop') && (
                                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                        Loop
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mt-1 text-sm">{variable.description}</p>
                                </div>
                                {isVariableExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </div>
                            
                            {isVariableExpanded && (
                              <div className="border-t p-4 bg-gray-50">
                                <dl className="grid grid-cols-1 gap-4">
                                  <div>
                                    <dt className="text-sm font-medium text-gray-700">Data Type</dt>
                                    <dd className="text-sm text-gray-900 mt-1 font-mono bg-gray-100 p-2 rounded">
                                      {variable.dataType}
                                    </dd>
                                  </div>
                                  
                                  <div>
                                    <dt className="text-sm font-medium text-gray-700">Example</dt>
                                    <dd className="text-sm text-gray-900 mt-1 font-mono bg-green-50 p-2 rounded border-l-4 border-green-400">
                                      {variable.example}
                                    </dd>
                                  </div>
                                  
                                  {variable.conditional && variable.conditionText && (
                                    <div>
                                      <dt className="text-sm font-medium text-orange-700 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Condition</span>
                                      </dt>
                                      <dd className="text-sm text-orange-800 mt-1 bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                                        {variable.conditionText}
                                      </dd>
                                    </div>
                                  )}
                                  
                                  {variable.note && !variable.conditional && (
                                    <div>
                                      <dt className="text-sm font-medium text-gray-700">Note</dt>
                                      <dd className="text-sm text-gray-600 mt-1 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                                        {variable.note}
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {filteredSections.length === 0 && searchTerm && (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-gray-500">No variables found matching "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
