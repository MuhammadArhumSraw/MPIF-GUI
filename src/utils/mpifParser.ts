import {
  MPIFData,
  MPIFMetadata,
  ProductInfo,
  SynthesisGeneral,
  SynthesisDetails,
  Characterization,
  PXRDData,
  TGAData,
  AdsorptionData,
  DesorptionData
} from '@/types/mpif';

export class MPIFParser {
  private lines: string[] = [];

  /**
   * Parse MPIF file content to structured data
   */
  public parse(content: string): MPIFData {
    // Keep all lines including empty ones for proper parsing of text blocks
    this.lines = content.split('\n').map(line => line.trim());

    const data: MPIFData = {
      metadata: this.parseMetadata(),
      productInfo: this.parseProductInfo(),
      synthesisGeneral: this.parseSynthesisGeneral(),
      synthesisDetails: this.parseSynthesisDetails(),
      characterization: this.parseCharacterization()
    };

    return data;
  }

  /**
   * Convert structured data back to MPIF format
   */
  public stringify(data: MPIFData): string {
    let result = '';

    // Data block name
    result += `data_${data.metadata.dataName}\n`;

    // Metadata
    result += `_mpif_audit_creation_date\t${data.metadata.creationDate}\n`;
    result += `_mpif_audit_generator_version\t${data.metadata.generatorVersion}\n`;
    if (data.metadata.publicationDOI) {
      result += `_mpif_audit_publication_doi\t'${data.metadata.publicationDOI}'\n`;
    } else {
      result += `_mpif_audit_publication_doi\t''\n`;
    }
    result += `_mpif_audit_procedure_status\t'${data.metadata.procedureStatus}'\n\n`;

    // Section 1: Author Details
    result += '#Section 1: Author details\n';
    result += `_mpif_audit_contact_author_name\t'${data.metadata.name}'\n`;
    result += `_mpif_audit_contact_author_email\t${data.metadata.email}\n`;
    result += `_mpif_audit_contact_author_id_orcid\t${data.metadata.orcid}\n`;
    result += `_mpif_audit_contact_author_address\t'${data.metadata.address || ''}'\n`;
    result += `_mpif_audit_contact_author_phone\t${data.metadata.phone || '?'}\n\n`;

    // Section 2: Product Information
    result += '#Section 2: Product General Information\n';
    result += `_mpif_product_type\t'${data.productInfo.type}'\n`;
    result += `_mpif_product_cas\t${data.productInfo.casNumber || '?'}\n`;
    result += `_mpif_product_ccdc\t'${data.productInfo.ccdcNumber || ''}'\n`;
    result += `_mpif_product_name_common\t'${data.productInfo.commonName}'\n`;
    result += `_mpif_product_name_systematic\t'${data.productInfo.systematicName || ''}'\n`;
    result += `_mpif_product_formula\t'${data.productInfo.formula || ''}'\n`;
    result += `_mpif_product_formula_weight\t${data.productInfo.formulaWeight || ''}\n`;
    result += `_mpif_product_state\t'${data.productInfo.state}'\n`;
    result += `_mpif_product_color\t'${data.productInfo.color}'\n`;
    result += `_mpif_product_handling_atmosphere\t'${data.productInfo.handlingAtmosphere}'\n`;
    result += `_mpif_product_handling_note\n;\n${data.productInfo.handlingNote || ''}\n;\n`;

    // Add CIF data if available
    if (data.productInfo.cif) {
      const cifString = typeof data.productInfo.cif === 'string'
        ? data.productInfo.cif
        : this.reconstructCifFromDict(data.productInfo.cif);
      result += `_mpif_product_cif\n;\n${cifString}\n;\n`;
    }
    result += '\n';

    // Section 3: Synthesis General Information
    result += '#Section 3: Synthesis General Information\n';
    result += `_mpif_synthesis_performed_date\t${data.synthesisGeneral.performedDate}\n`;
    result += `_mpif_synthesis_lab_temperature_C\t${data.synthesisGeneral.labTemperature}\n`;
    result += `_mpif_synthesis_lab_humidity_percent\t${data.synthesisGeneral.labHumidity}\n`;
    result += `_mpif_synthesis_type\t'${data.synthesisGeneral.reactionType}'\n`;
    // Conditional parameters based on type
    if (data.synthesisGeneral.reactionType === 'evaporation' && data.synthesisGeneral.evaporationMethod) {
      result += `_mpif_synthesis_evap_method\t'${data.synthesisGeneral.evaporationMethod}'\n`;
    }
    if (data.synthesisGeneral.reactionType === 'microwave' && data.synthesisGeneral.microwavePower !== undefined) {
      result += `_mpif_synthesis_react_microwave_power_W\t${data.synthesisGeneral.microwavePower}\n`;
    }
    if (data.synthesisGeneral.reactionType === 'mechanochemical' && data.synthesisGeneral.mechanochemicalMethod) {
      result += `_mpif_synthesis_react_mechanochem_method\t'${data.synthesisGeneral.mechanochemicalMethod}'\n`;
    }
    if (data.synthesisGeneral.reactionType === 'electrochemical') {
      if (data.synthesisGeneral.electrochemicalCathode) result += `_mpif_synthesis_react_electrochem_cathode\t${data.synthesisGeneral.electrochemicalCathode}\n`;
      if (data.synthesisGeneral.electrochemicalAnode) result += `_mpif_synthesis_react_electrochem_anode\t${data.synthesisGeneral.electrochemicalAnode}\n`;
      if (data.synthesisGeneral.electrochemicalReference) result += `_mpif_synthesis_react_electrochem_reference\t${data.synthesisGeneral.electrochemicalReference}\n`;
      if (data.synthesisGeneral.electrochemicalVoltage !== undefined) result += `_mpif_synthesis_react_electrochem_voltage_V\t${data.synthesisGeneral.electrochemicalVoltage}\n`;
      if (data.synthesisGeneral.electrochemicalCurrent !== undefined) result += `_mpif_synthesis_react_electrochem_current_A\t${data.synthesisGeneral.electrochemicalCurrent}\n`;
    }
    if (data.synthesisGeneral.reactionType === 'sonochemical') {
      if (data.synthesisGeneral.sonicationMethod) result += `_mpif_synthesis_react_sonication_method\t'${data.synthesisGeneral.sonicationMethod}'\n`;
      if (data.synthesisGeneral.sonicationPower !== undefined) result += `_mpif_synthesis_react_sonication_power\t${data.synthesisGeneral.sonicationPower}\n`;
      if (data.synthesisGeneral.sonicationPowerUnit) result += `_mpif_synthesis_react_sonication_power_unit\t'${data.synthesisGeneral.sonicationPowerUnit}'\n`;
    }
    if (data.synthesisGeneral.reactionType === 'photochemical') {
      if (data.synthesisGeneral.photochemicalWavelength !== undefined) result += `_mpif_synthesis_react_photochemical_wavelength_nm\t${data.synthesisGeneral.photochemicalWavelength}\n`;
      if (data.synthesisGeneral.photochemicalPower !== undefined) result += `_mpif_synthesis_react_photochemical_power_W\t${data.synthesisGeneral.photochemicalPower}\n`;
      if (data.synthesisGeneral.photochemicalSource) result += `_mpif_synthesis_react_photochemical_source\t${data.synthesisGeneral.photochemicalSource}\n`;
    }
    result += `_mpif_synthesis_react_temperature_C\t${data.synthesisGeneral.reactionTemperature}\n`;
    result += `_mpif_synthesis_react_temperature_controller\t'${data.synthesisGeneral.temperatureController}'\n`;
    result += `_mpif_synthesis_react_time\t${data.synthesisGeneral.reactionTime}\n`;
    result += `_mpif_synthesis_react_time_unit\t'${data.synthesisGeneral.reactionTimeUnit}'\n`;
    result += `_mpif_synthesis_react_atmosphere\t'${data.synthesisGeneral.reactionAtmosphere}'\n`;
    result += `_mpif_synthesis_react_container\t'${data.synthesisGeneral.reactionContainer}'\n`;
    result += `_mpif_synthesis_react_note\n;\n${data.synthesisGeneral.reactionNote || ''}\n;\n`;
    result += `_mpif_synthesis_product_amount\t${data.synthesisGeneral.productAmount}\n`;
    result += `_mpif_synthesis_product_amount_unit\t'${data.synthesisGeneral.productAmountUnit}'\n`;
    if (data.synthesisGeneral.productYield) {
      result += `_mpif_synthesis_product_yield_percent\t${data.synthesisGeneral.productYield}\n`;
    }
    result += `_mpif_synthesis_scale\t'${data.synthesisGeneral.scale}'\n`;
    result += `_mpif_synthesis_safety_note\n;\n${data.synthesisGeneral.safetyNote || ''}\n;\n\n`;

    // Section 4: Synthesis Details
    result += '#Section 4: Synthesis Procedure Details\n';

    // Substrates
    if (data.synthesisDetails.substrates.length > 0) {
      result += `_mpif_substrate_number\t${data.synthesisDetails.substrates.length}\n`;
      result += 'loop_\n';
      result += '_mpif_substrate_id\n_mpif_substrate_name\n_mpif_substrate_molarity\n_mpif_substrate_molarity_unit\n_mpif_substrate_amount\n_mpif_substrate_amount_unit\n_mpif_substrate_supplier\n_mpif_substrate_purity_percent\n_mpif_substrate_cas\n_mpif_substrate_smiles\n';

      data.synthesisDetails.substrates.forEach((substrate, index) => {
        result += `${this.sequenceId('R', index)}\t${substrate.name}\t${substrate.molarity || ''}\t${substrate.molarityUnit || ''}\t${substrate.amount}\t${substrate.amountUnit}\t${substrate.supplier || ''}\t${substrate.purity || ''}\t${substrate.casNumber || ''}\t${substrate.smiles || '?'}\n`;
      });
      result += '\n';
    }

    // Solvents
    if (data.synthesisDetails.solvents.length > 0) {
      result += `_mpif_solvent_number\t${data.synthesisDetails.solvents.length}\n`;
      result += 'loop_\n';
      result += '_mpif_solvent_id\n_mpif_solvent_name\n_mpif_solvent_molarity\n_mpif_solvent_molarity_unit\n_mpif_solvent_amount\n_mpif_solvent_amount_unit\n_mpif_solvent_supplier\n_mpif_solvent_purity_percent\n_mpif_solvent_cas\n_mpif_solvent_smiles\n';

      data.synthesisDetails.solvents.forEach((solvent, index) => {
        result += `${this.sequenceId('S', index)}\t${solvent.name}\t${solvent.molarity || ''}\t${solvent.molarityUnit || ''}\t${solvent.amount}\t${solvent.amountUnit}\t${solvent.supplier || ''}\t${solvent.purity || ''}\t${solvent.casNumber || ''}\t${solvent.smiles || '?'}\n`;
      });
      result += '\n';
    }

    // Catalysts
    if (data.synthesisDetails.catalysts?.length > 0) {
      result += `_mpif_catalyst_number\t${data.synthesisDetails.catalysts.length}\n`;
      result += 'loop_\n';
      result += '_mpif_catalyst_id\n_mpif_catalyst_name\n_mpif_catalyst_amount\n_mpif_catalyst_unit\n_mpif_catalyst_supplier\n_mpif_catalyst_purity_percent\n_mpif_catalyst_cas\n_mpif_catalyst_smiles\n_mpif_catalyst_note\n';

      data.synthesisDetails.catalysts.forEach((catalyst, index) => {
        result += `${this.sequenceId('C', index)}\t${catalyst.name}\t${catalyst.amount}\t${catalyst.unit}\t${catalyst.supplier || ''}\t${catalyst.purity || ''}\t${catalyst.casNumber || ''}\t${catalyst.smiles || '?'}\t${catalyst.note || '-'}\n`;
      });
      result += '\n';
    }

    // Vessels
    if (data.synthesisDetails.vessels.length > 0) {
      result += `_mpif_vessel_number\t${data.synthesisDetails.vessels.length}\n`;
      result += 'loop_\n';
      result += '_mpif_vessel_id\n_mpif_vessel_volume\n_mpif_vessel_volume_unit\n_mpif_vessel_material\n_mpif_vessel_type\n_mpif_vessel_supplier\n_mpif_vessel_purpose\n_mpif_vessel_note\n';

      data.synthesisDetails.vessels.forEach((vessel, index) => {
        result += `${this.sequenceId('V', index)}\t${vessel.volume}\t${vessel.volumeUnit}\t${vessel.material}\t${vessel.type}\t${vessel.supplier || '-'}\t${vessel.purpose}\t${vessel.note || '-'}\n`;
      });
      result += '\n';
    }

    // Hardware
    if (data.synthesisDetails.hardware.length > 0) {
      result += `_mpif_hardware_number\t${data.synthesisDetails.hardware.length}\n`;
      result += 'loop_\n';
      result += '_mpif_hardware_id\n_mpif_hardware_purpose\n_mpif_hardware_general_name\n_mpif_hardware_product_name\n_mpif_hardware_supplier\n_mpif_hardware_note\n';

      data.synthesisDetails.hardware.forEach((hardware, index) => {
        result += `${this.sequenceId('H', index)}\t${hardware.purpose}\t${hardware.generalName}\t${hardware.productName || ''}\t${hardware.supplier || ''}\t${hardware.note || '-'}\n`;
      });
      result += '\n';
    }

    // Procedure Steps
    if (data.synthesisDetails.steps.length > 0) {
      result += `_mpif_procedure_number\t${data.synthesisDetails.steps.length}\n`;
      result += 'loop_\n';
      result += '_mpif_procedure_id\n_mpif_procedure_type\n_mpif_procedure_atmosphere\n_mpif_procedure_detail\n';

      data.synthesisDetails.steps.forEach((step, index) => {
        result += `${this.sequenceId('P', index)}\t${step.type}\t${step.atmosphere}\t${step.detail}\n`;
      });
      result += '\n';
    }

    if (data.synthesisDetails.procedureFull) {
      result += `_mpif_procedure_full\n;\n${data.synthesisDetails.procedureFull}\n;\n\n`;
    }

    // Characterization
    if (data.characterization.pxrd || data.characterization.tga || data.characterization.aif) {
      result += '#Characterization Information\n\n';

      if (data.characterization.pxrd) {
        result += '_mpif_pxrd_data\n;\n';
        result += `_mpif_pxrd_source\t'${data.characterization.pxrd.source}'\n`;
        if (data.characterization.pxrd.wavelength) {
          result += `_mpif_pxrd_lambda\t${data.characterization.pxrd.wavelength}\n`;
        }
        result += 'loop_\n_pxrd_2theta\n_pxrd_intensity\n';
        data.characterization.pxrd.data.forEach(point => {
          result += `${point.twoTheta}\t${point.intensity}\n`;
        });
        result += ';\n\n';
      }

      if (data.characterization.tga) {
        result += '_mpif_tga_data\n;\nloop_\n_tga_temperature_celcius\n_tga_weight_percent\n';
        data.characterization.tga.data.forEach(point => {
          result += `${point.temperature}\t${point.weightPercent}\n`;
        });
        result += ';\n\n';
      }

      if (data.characterization.aif) {
        const aifString = typeof data.characterization.aif === 'string'
          ? data.characterization.aif
          : this.reconstructAifFromDict(data.characterization.aif);
        result += `_mpif_aif\n;\n${aifString}\n;\n`;
      }
    }

    return result;
  }

  private sequenceId(prefix: string, index: number): string {
    return `${prefix}${index + 1}`;
  }

  private reconstructCifFromDict(cifDict: any): string {
    let result = '';

    if (cifDict.dataName) {
      result += `data_${cifDict.dataName}\n`;
    }

    // Add properties
    for (const [key, value] of Object.entries(cifDict.properties || {})) {
      result += `${key}   ${value}\n`;
    }

    // Add loops
    for (const loop of cifDict.loops || []) {
      result += 'loop_\n';
      for (const header of loop.headers) {
        result += ` ${header}\n`;
      }
      for (const row of loop.data) {
        result += `  ${row.join('  ')}\n`;
      }
    }

    return result.trim();
  }

  private reconstructAifFromDict(aifDict: any): string {
    let result = '';

    if (aifDict.dataName) {
      result += `data_${aifDict.dataName}\n\n`;
    }

    // Add properties
    for (const [key, value] of Object.entries(aifDict.properties || {})) {
      result += `_${key}           ${value}\n`;
    }

    // Add adsorption data
    if (aifDict.adsorptionData && aifDict.adsorptionData.length > 0) {
      result += '\nloop_\n';
      result += '_adsorp_pressure\n';
      result += '_adsorp_loading\n';
      for (const point of aifDict.adsorptionData) {
        result += `${point.pressure}    ${point.loading}\n`;
      }
    }

    // Add desorption data
    if (aifDict.desorptionData && aifDict.desorptionData.length > 0) {
      result += '\nloop_\n';
      result += '_desorp_pressure\n';
      result += '_desorp_loading\n';
      for (const point of aifDict.desorptionData) {
        result += `${point.pressure}    ${point.loading}\n`;
      }
    }

    return result.trim();
  }

  private parseMetadata(): MPIFMetadata {
    const metadata: Partial<MPIFMetadata> = {};

    // Parse data block name
    const dataLine = this.findLine(/^data_(.+)$/);
    metadata.dataName = dataLine ? dataLine[1] : '';

    metadata.creationDate = this.extractValue('_mpif_audit_creation_date') || '';
    metadata.generatorVersion = this.extractValue('_mpif_audit_generator_version') || '';
    metadata.publicationDOI = this.extractValue('_mpif_audit_publication_doi')?.replace(/'/g, '') || '';
    metadata.procedureStatus = this.extractValue('_mpif_audit_procedure_status')?.replace(/'/g, '') as any || 'test';

    // Parse author details into metadata
    metadata.name = this.extractValue('_mpif_audit_contact_author_name')?.replace(/'/g, '') || '';
    metadata.email = this.extractValue('_mpif_audit_contact_author_email') || '';
    metadata.orcid = this.extractValue('_mpif_audit_contact_author_id_orcid') || '';
    metadata.address = this.extractValue('_mpif_audit_contact_author_address')?.replace(/'/g, '') || '';
    metadata.phone = this.extractValue('_mpif_audit_contact_author_phone') || '';

    return metadata as MPIFMetadata;
  }

  private parseProductInfo(): ProductInfo {
    const cifData = this.extractTextBlock('_mpif_product_cif');
    let parsedCif: any = undefined;

    // Parse CIF into structured format if available
    if (cifData) {
      try {
        parsedCif = this.parseCifToDict(cifData);
      } catch (error) {
        console.warn('Failed to parse CIF data, keeping as string:', error);
        parsedCif = cifData;
      }
    }

    return {
      type: this.extractValue('_mpif_product_type')?.replace(/'/g, '') as any || 'other',
      casNumber: this.extractValue('_mpif_product_cas'),
      ccdcNumber: this.extractValue('_mpif_product_ccdc')?.replace(/'/g, ''),
      commonName: this.extractValue('_mpif_product_name_common')?.replace(/'/g, '') || '',
      systematicName: this.extractValue('_mpif_product_name_systematic')?.replace(/'/g, ''),
      formula: this.extractValue('_mpif_product_formula')?.replace(/'/g, ''),
      formulaWeight: parseFloat(this.extractValue('_mpif_product_formula_weight') || '0') || undefined,
      state: this.extractValue('_mpif_product_state')?.replace(/'/g, '') as any || 'solid',
      color: this.extractValue('_mpif_product_color')?.replace(/'/g, '') || '#000000',
      handlingAtmosphere: this.extractValue('_mpif_product_handling_atmosphere')?.replace(/'/g, '') as any || 'air',
      handlingNote: this.extractTextBlock('_mpif_product_handling_note'),
      cif: parsedCif
    };
  }

  private parseSynthesisGeneral(): SynthesisGeneral {
    const synthesis: any = {
      performedDate: this.extractValue('_mpif_synthesis_performed_date') || '',
      labTemperature: parseFloat(this.extractValue('_mpif_synthesis_lab_temperature_C') || '0'),
      labHumidity: parseFloat(this.extractValue('_mpif_synthesis_lab_humidity_percent') || '0'),
      reactionType: this.extractValue('_mpif_synthesis_type')?.replace(/'/g, '') || 'mix',
      reactionTemperature: parseFloat(this.extractValue('_mpif_synthesis_react_temperature_C') || '0'),
      temperatureController: this.extractValue('_mpif_synthesis_react_temperature_controller')?.replace(/'/g, '') || 'ambient',
      reactionTime: parseFloat(this.extractValue('_mpif_synthesis_react_time') || '0'),
      reactionTimeUnit: this.extractValue('_mpif_synthesis_react_time_unit')?.replace(/'/g, '') || 'h',
      reactionAtmosphere: this.extractValue('_mpif_synthesis_react_atmosphere')?.replace(/'/g, '') || 'air',
      reactionContainer: this.extractValue('_mpif_synthesis_react_container')?.replace(/'/g, '') || '',
      reactionNote: this.extractTextBlock('_mpif_synthesis_react_note'),
      productAmount: parseFloat(this.extractValue('_mpif_synthesis_product_amount') || '0'),
      productAmountUnit: this.extractValue('_mpif_synthesis_product_amount_unit')?.replace(/'/g, '') || 'mg',
      productYield: parseFloat(this.extractValue('_mpif_synthesis_product_yield_percent') || '0') || undefined,
      scale: this.extractValue('_mpif_synthesis_scale')?.replace(/'/g, '') || 'milligram',
      safetyNote: this.extractTextBlock('_mpif_synthesis_safety_note')
    };

    // Optional fields depending on type
    const type = synthesis.reactionType as string;
    if (type === 'evaporation') {
      synthesis.evaporationMethod = this.extractValue('_mpif_synthesis_evap_method')?.replace(/'/g, '');
    }
    if (type === 'microwave') {
      const power = this.extractValue('_mpif_synthesis_react_microwave_power_W');
      synthesis.microwavePower = power ? parseFloat(power) : undefined;
    }
    if (type === 'mechanochemical') {
      synthesis.mechanochemicalMethod = this.extractValue('_mpif_synthesis_react_mechanochem_method')?.replace(/'/g, '');
    }
    if (type === 'electrochemical') {
      synthesis.electrochemicalCathode = this.extractValue('_mpif_synthesis_react_electrochem_cathode')?.replace(/'/g, '');
      synthesis.electrochemicalAnode = this.extractValue('_mpif_synthesis_react_electrochem_anode')?.replace(/'/g, '');
      synthesis.electrochemicalReference = this.extractValue('_mpif_synthesis_react_electrochem_reference')?.replace(/'/g, '');
      const v = this.extractValue('_mpif_synthesis_react_electrochem_voltage_V');
      synthesis.electrochemicalVoltage = v ? parseFloat(v) : undefined;
      const a = this.extractValue('_mpif_synthesis_react_electrochem_current_A');
      synthesis.electrochemicalCurrent = a ? parseFloat(a) : undefined;
    }
    if (type === 'sonochemical') {
      synthesis.sonicationMethod = this.extractValue('_mpif_synthesis_react_sonication_method')?.replace(/'/g, '') as any;
      const p = this.extractValue('_mpif_synthesis_react_sonication_power');
      synthesis.sonicationPower = p ? parseFloat(p) : undefined;
      synthesis.sonicationPowerUnit = this.extractValue('_mpif_synthesis_react_sonication_power_unit')?.replace(/'/g, '') as any;
    }
    if (type === 'photochemical') {
      const wl = this.extractValue('_mpif_synthesis_react_photochemical_wavelength_nm');
      synthesis.photochemicalWavelength = wl ? parseFloat(wl) : undefined;
      const pw = this.extractValue('_mpif_synthesis_react_photochemical_power_W');
      synthesis.photochemicalPower = pw ? parseFloat(pw) : undefined;
      synthesis.photochemicalSource = this.extractValue('_mpif_synthesis_react_photochemical_source')?.replace(/'/g, '');
    }

    return synthesis;
  }

  private parseSynthesisDetails(): SynthesisDetails {
    return {
      substrates: this.parseLoopData('substrate', [
        'id', 'name', 'molarity', 'molarityUnit', 'amount', 'amountUnit',
        'supplier', 'purity', 'casNumber', 'smiles'
      ]),
      solvents: this.parseLoopData('solvent', [
        'id', 'name', 'molarity', 'molarityUnit', 'amount', 'amountUnit',
        'supplier', 'purity', 'casNumber', 'smiles'
      ]),
      catalysts: this.parseLoopData('catalyst', [
        'id', 'name', 'amount', 'unit', 'supplier', 'purity', 'casNumber', 'smiles', 'note'
      ]),
      vessels: this.parseLoopData('vessel', [
        'id', 'volume', 'volumeUnit', 'material', 'type', 'supplier', 'purpose', 'note'
      ]),
      hardware: this.parseLoopData('hardware', [
        'id', 'purpose', 'generalName', 'productName', 'supplier', 'note'
      ]),
      steps: this.parseLoopData('procedure', [
        'id', 'type', 'atmosphere', 'detail'
      ]),
      procedureFull: this.extractTextBlock('_mpif_procedure_full')
    };
  }

  private parseCifToDict(cifText: string): any {
    const lines = cifText.split('\n').map(l => l.trim()).filter(l => l);
    const result: any = {
      dataName: '',
      properties: {},
      loops: []
    };

    // Extract data name
    for (const line of lines) {
      if (line.startsWith('data_')) {
        result.dataName = line.substring(5);
        break;
      }
    }

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('data_')) {
        i++;
        continue;
      }

      if (line.startsWith('loop_')) {
        // Parse loop
        const headers: string[] = [];
        i++;

        // Collect headers
        while (i < lines.length && lines[i].startsWith('_')) {
          headers.push(lines[i]);
          i++;
        }

        // Collect data rows
        const data: string[][] = [];
        while (i < lines.length && !lines[i].startsWith('_') && !lines[i].startsWith('loop_') && !lines[i].startsWith('#')) {
          const row = lines[i].split(/\s+/);
          if (row.length > 0 && row[0]) {
            data.push(row);
          }
          i++;
        }

        if (headers.length > 0) {
          result.loops.push({ headers, data });
        }
      } else if (line.startsWith('_')) {
        // Parse property
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const key = parts[0];
          const value = parts.slice(1).join(' ');
          result.properties[key] = value;
        }
        i++;
      } else {
        i++;
      }
    }

    return result;
  }

  private parseAifToDict(aifText: string): any {
    const lines = aifText.split('\n').map(l => l.trim());
    const result: any = {
      dataName: '',
      properties: {},
      adsorptionData: [],
      desorptionData: []
    };

    // Extract data name
    for (const line of lines) {
      if (line.startsWith('data_')) {
        result.dataName = line.substring(5);
        break;
      }
    }

    let inAdsorptionLoop = false;
    let inDesorptionLoop = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line || line.startsWith('#')) {
        continue;
      }

      if (line.startsWith('_') && !line.startsWith('_adsorp_') && !line.startsWith('_desorp_')) {
        // Property line
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const key = parts[0].substring(1); // Remove leading underscore
          const value = parts.slice(1).join(' ');
          result.properties[key] = value;
        }
        inAdsorptionLoop = false;
        inDesorptionLoop = false;
      } else if (line.includes('_adsorp_pressure') || line.includes('_adsorp_loading')) {
        inAdsorptionLoop = true;
        inDesorptionLoop = false;
      } else if (line.includes('_desorp_pressure') || line.includes('_desorp_loading')) {
        inDesorptionLoop = true;
        inAdsorptionLoop = false;
      } else if (line.startsWith('loop_')) {
        // Continue to next line
        continue;
      } else if (inAdsorptionLoop && line.match(/^[\d.\-+eE]+\s+[\d.\-+eE]+/)) {
        // Adsorption data line
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          result.adsorptionData.push({
            pressure: parseFloat(parts[0]),
            loading: parseFloat(parts[1])
          });
        }
      } else if (inDesorptionLoop && line.match(/^[\d.\-+eE]+\s+[\d.\-+eE]+/)) {
        // Desorption data line
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          result.desorptionData.push({
            pressure: parseFloat(parts[0]),
            loading: parseFloat(parts[1])
          });
        }
      }
    }

    return result;
  }

  private parseCharacterization(): Characterization {
    const characterization: Characterization = {};

    // Parse PXRD data
    const pxrdStartIndex = this.findLineIndex('_mpif_pxrd_data');
    if (pxrdStartIndex !== -1) {
      const pxrd: Partial<PXRDData> = {
        data: []
      };

      let inLoopData = false;
      let foundDataEnd = false;

      for (let i = pxrdStartIndex + 1; i < this.lines.length && !foundDataEnd; i++) {
        const line = this.lines[i];

        if (line === ';' && inLoopData) {
          foundDataEnd = true;
          break;
        } else if (line.includes('_mpif_pxrd_source')) {
          pxrd.source = this.extractLineValue(line, '_mpif_pxrd_source')?.replace(/'/g, '') as any;
        } else if (line.includes('_mpif_pxrd_lambda')) {
          const wavelength = this.extractLineValue(line, '_mpif_pxrd_lambda');
          pxrd.wavelength = wavelength ? parseFloat(wavelength) : undefined;
        } else if (line.includes('_pxrd_2theta') || line.includes('_pxrd_intensity')) {
          inLoopData = true;
        } else if (inLoopData && !line.startsWith('_')) {
          const values = this.parseNumericColumns(line, 2);
          if (values) {
            const [twoTheta, intensity] = values;
            pxrd.data!.push({
              twoTheta,
              intensity
            });
          }
        } else if (line.startsWith('_mpif_') && inLoopData) {
          // New section started, stop parsing PXRD
          foundDataEnd = true;
        }
      }

      if (pxrd.data!.length > 0) {
        characterization.pxrd = pxrd as PXRDData;
      }
    }

    // Parse TGA data
    const tgaStartIndex = this.findLineIndex('_mpif_tga_data');
    if (tgaStartIndex !== -1) {
      const tga: TGAData = { data: [] };

      let inLoopData = false;
      let foundDataEnd = false;

      for (let i = tgaStartIndex + 1; i < this.lines.length && !foundDataEnd; i++) {
        const line = this.lines[i];

        if (line === ';' && inLoopData) {
          foundDataEnd = true;
          break;
        } else if (line.includes('_tga_temperature_celcius') || line.includes('_tga_temperature_celsius')) {
          inLoopData = true;
        } else if (line.includes('_tga_weight_percent')) {
          inLoopData = true;
          const inlineValues = this.parseNumericColumns(line.replace('_tga_weight_percent', ''), 2);
          if (inlineValues) {
            const [temperature, weightPercent] = inlineValues;
            tga.data.push({
              temperature,
              weightPercent
            });
          }
        } else if (inLoopData && !line.startsWith('_')) {
          const values = this.parseNumericColumns(line, 2);
          if (values) {
            const [temperature, weightPercent] = values;
            tga.data.push({
              temperature,
              weightPercent
            });
          }
        } else if (line.startsWith('_mpif_') && inLoopData) {
          // New section started, stop parsing TGA
          foundDataEnd = true;
        }
      }

      if (tga.data.length > 0) {
        characterization.tga = tga;
      }
    }

    // Parse Adsorption data
    const adsorptionStartIndex = this.findLineIndex('_adsorp_pressure');
    if (adsorptionStartIndex !== -1) {
      const adsorption: Partial<AdsorptionData> = {
        data: [],
        units: {}
      };

      // Parse metadata before the loop
      for (let i = 0; i < adsorptionStartIndex; i++) {
        const line = this.lines[i];
        if (line.includes('_exptl_temperature')) {
          const value = this.extractLineValue(line, '_exptl_temperature');
          adsorption.experimentalTemperature = value ? parseFloat(value) : undefined;
        } else if (line.includes('_exptl_method')) {
          adsorption.experimentalMethod = this.extractLineValue(line, '_exptl_method')?.replace(/'/g, '');
        } else if (line.includes('_adsnt_sample_mass')) {
          const value = this.extractLineValue(line, '_adsnt_sample_mass');
          adsorption.sampleMass = value ? parseFloat(value) : undefined;
        } else if (line.includes('_adsnt_sample_id')) {
          adsorption.sampleId = this.extractLineValue(line, '_adsnt_sample_id')?.replace(/'/g, '');
        } else if (line.includes('_adsnt_material_id')) {
          adsorption.materialId = this.extractLineValue(line, '_adsnt_material_id')?.replace(/'/g, '');
        } else if (line.includes('_adsnt_info')) {
          adsorption.sampleInfo = this.extractLineValue(line, '_adsnt_info')?.replace(/'/g, '');
        } else if (line.includes('_units_temperature')) {
          adsorption.units!.temperature = this.extractLineValue(line, '_units_temperature')?.replace(/'/g, '');
        } else if (line.includes('_units_pressure')) {
          adsorption.units!.pressure = this.extractLineValue(line, '_units_pressure')?.replace(/'/g, '');
        } else if (line.includes('_units_mass')) {
          adsorption.units!.mass = this.extractLineValue(line, '_units_mass')?.replace(/'/g, '');
        } else if (line.includes('_units_loading')) {
          adsorption.units!.loading = this.extractLineValue(line, '_units_loading')?.replace(/'/g, '');
        }
      }

      let inLoopData = false;
      let foundDataEnd = false;

      for (let i = adsorptionStartIndex + 1; i < this.lines.length && !foundDataEnd; i++) {
        const line = this.lines[i];

        if (line.includes('_adsorp_p0') || line.includes('_adsorp_amount')) {
          inLoopData = true;
        } else if (inLoopData && !line.startsWith('_')) {
          const values = this.parseNumericColumns(line, 3);
          if (values) {
            const [pressure, p0, amount] = values;
            adsorption.data!.push({
              pressure,
              p0,
              amount
            });
          }
        } else if (line.startsWith('_desorp_') || line.startsWith('#') || line === '') {
          // New section started, stop parsing adsorption
          foundDataEnd = true;
        }
      }

      if (adsorption.data!.length > 0) {
        characterization.adsorption = adsorption as AdsorptionData;
      }
    }

    // Parse Desorption data
    const desorptionStartIndex = this.findLineIndex('_desorp_pressure');
    if (desorptionStartIndex !== -1) {
      const desorption: DesorptionData = { data: [] };

      let inLoopData = false;
      let foundDataEnd = false;

      for (let i = desorptionStartIndex + 1; i < this.lines.length && !foundDataEnd; i++) {
        const line = this.lines[i];

        if (line.includes('_desorp_p0') || line.includes('_desorp_amount')) {
          inLoopData = true;
        } else if (inLoopData && !line.startsWith('_')) {
          const values = this.parseNumericColumns(line, 3);
          if (values) {
            const [pressure, p0, amount] = values;
            desorption.data.push({
              pressure,
              p0,
              amount
            });
          }
        } else if (line.startsWith('_') && !line.startsWith('_desorp_') || line.startsWith('#')) {
          // New section started, stop parsing desorption
          foundDataEnd = true;
        }
      }

      if (desorption.data.length > 0) {
        characterization.desorption = desorption;
      }
    }

    // Parse AIF data
    const aifData = this.extractTextBlock('_mpif_aif');
    if (aifData) {
      try {
        characterization.aif = this.parseAifToDict(aifData);
      } catch (error) {
        console.warn('Failed to parse AIF data, keeping as string:', error);
        characterization.aif = aifData;
      }
    }

    return characterization;
  }

  private parseLoopData(type: string, fields: string[]): any[] {
    const numberKey = `_mpif_${type}_number`;
    const count = parseInt(this.extractValue(numberKey) || '0');

    if (count === 0) return [];

    const results: any[] = [];
    const loopStart = this.findLineIndex(`_mpif_${type}_id`);

    if (loopStart === -1) return [];

    // Skip header lines to get to data
    let dataStart = loopStart;
    for (let i = loopStart; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (!line.startsWith('_mpif_') && !line.startsWith('loop_') && line.trim() !== '') {
        dataStart = i;
        break;
      }
    }

    let itemsParsed = 0;
    for (let i = dataStart; i < this.lines.length && itemsParsed < count; i++) {
      const line = this.lines[i];

      // Stop if we hit a new section
      if (line.startsWith('_mpif_') || line.startsWith('#') || line === '') {
        break;
      }

      const values = line.split('\t');
      if (values.length < fields.length) continue; // Skip malformed lines

      const item: any = {};

      fields.forEach((field, index) => {
        let value = values[index] || '';

        // Type conversion
        if (['molarity', 'amount', 'purity', 'volume'].includes(field)) {
          const numValue = parseFloat(value);
          item[field] = isNaN(numValue) ? undefined : numValue;
        } else {
          // Clean up string values
          value = value.trim();
          item[field] = (value === '?' || value === '-' || value === '') ? undefined : value;
        }
      });

      results.push(item);
      itemsParsed++;
    }

    return results;
  }

  private extractValue(key: string): string | undefined {
    const line = this.lines.find(line => line.startsWith(key));
    if (!line) return undefined;

    return this.extractLineValue(line, key);
  }

  private extractLineValue(line: string, key: string): string | undefined {
    if (!line.startsWith(key)) return undefined;

    const value = line.slice(key.length).trim();
    return value || undefined;
  }

  private parseNumericColumns(line: string, expectedColumns: number): number[] | undefined {
    const values = line
      .trim()
      .split(/[\t,\s]+/)
      .filter(Boolean)
      .slice(0, expectedColumns)
      .map(Number);

    if (values.length < expectedColumns || values.some(Number.isNaN)) {
      return undefined;
    }

    return values;
  }

  private extractTextBlock(key: string): string | undefined {
    const startIndex = this.findLineIndex(key);
    if (startIndex === -1) return undefined;

    let content = '';
    let inBlock = false;
    let foundStart = false;

    for (let i = startIndex + 1; i < this.lines.length; i++) {
      const line = this.lines[i];

      if (line === ';') {
        if (inBlock) {
          break; // End of block
        } else {
          inBlock = true; // Start of block
          foundStart = true;
        }
      } else if (inBlock) {
        content += (content ? '\n' : '') + line;
      } else if (!foundStart && line.trim() !== '' && !line.startsWith('_') && !line.startsWith('#')) {
        // Handle cases where text block doesn't start with semicolon
        content += (content ? '\n' : '') + line;
        // Look ahead to see if we encounter a semicolon or new section
        let nextLineIndex = i + 1;
        while (nextLineIndex < this.lines.length) {
          const nextLine = this.lines[nextLineIndex];
          if (nextLine === ';') {
            i = nextLineIndex; // Skip to the closing semicolon
            break;
          } else if (nextLine.startsWith('_') || nextLine.startsWith('#')) {
            i = nextLineIndex - 1; // Step back one line
            break;
          } else if (nextLine.trim() !== '') {
            content += '\n' + nextLine;
          }
          nextLineIndex++;
        }
        break;
      }
    }

    return content.trim() || undefined;
  }

  private findLine(pattern: RegExp): RegExpMatchArray | null {
    for (const line of this.lines) {
      const match = line.match(pattern);
      if (match) return match;
    }
    return null;
  }

  private findLineIndex(searchText: string): number {
    return this.lines.findIndex(line => line.startsWith(searchText));
  }
}

// Export convenience functions
export const parseMPIF = (content: string): MPIFData => {
  const parser = new MPIFParser();
  return parser.parse(content);
};

export const stringifyMPIF = (data: MPIFData): string => {
  const parser = new MPIFParser();
  return parser.stringify(data);
};
