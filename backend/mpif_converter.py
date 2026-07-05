"""
MPIF Converter Module

This module provides functions to convert data between JSON and MPIF (Material Property Information Format).
The MPIF format is based on the CIF (Crystallographic Information File) format with custom fields
for material synthesis and characterization data.
"""

import json
import re
from typing import Dict, Any, List, Optional, Union


def json_to_mpif(json_data: Union[str, Dict[str, Any]]) -> str:
    """
    Convert JSON data to MPIF format.
    
    Args:
        json_data: Either a JSON string or a dictionary containing MPIF data with the following structure:
            - metadata: dict with creationDate, generatorVersion, etc.
            - productInfo: dict with product details
            - synthesisGeneral: dict with synthesis general information
            - synthesisDetails: dict with substrates, solvents, vessels, hardware, steps
            - characterization: dict with pxrd, tga, adsorption, desorption, aif data
    
    Returns:
        str: MPIF formatted string
    
    Example:
        >>> data = {"metadata": {"dataName": "test", ...}, ...}
        >>> mpif_str = json_to_mpif(data)
    """
    # Parse JSON string if needed
    if isinstance(json_data, str):
        data = json.loads(json_data)
    else:
        data = json_data
    
    result = []
    
    # Data block name
    metadata = data.get('metadata', {})
    result.append(f"data_{metadata.get('dataName', 'unknown')}")
    
    # Metadata
    result.append(f"_mpif_audit_creation_date\t{metadata.get('creationDate', '')}")
    result.append(f"_mpif_audit_generator_version\t{metadata.get('generatorVersion', '')}")
    pub_doi = metadata.get('publicationDOI', '')
    result.append(f"_mpif_audit_publication_doi\t'{pub_doi}'")
    result.append(f"_mpif_audit_procedure_status\t'{metadata.get('procedureStatus', 'test')}'")
    result.append("")
    
    # Section 1: Author Details
    result.append("#Section 1: Author details")
    result.append(f"_mpif_audit_contact_author_name\t'{metadata.get('name', '')}'")
    result.append(f"_mpif_audit_contact_author_email\t{metadata.get('email', '')}")
    result.append(f"_mpif_audit_contact_author_id_orcid\t{metadata.get('orcid', '')}")
    result.append(f"_mpif_audit_contact_author_address\t'{metadata.get('address', '')}'")
    result.append(f"_mpif_audit_contact_author_phone\t{metadata.get('phone', '?')}")
    result.append("")
    
    # Section 2: Product Information
    product = data.get('productInfo', {})
    result.append("#Section 2: Product General Information")
    result.append(f"_mpif_product_type\t'{product.get('type', '')}'")
    result.append(f"_mpif_product_cas\t{product.get('casNumber', '?')}")
    result.append(f"_mpif_product_ccdc\t'{product.get('ccdcNumber', '')}'")
    result.append(f"_mpif_product_name_common\t'{product.get('commonName', '')}'")
    result.append(f"_mpif_product_name_systematic\t'{product.get('systematicName', '')}'")
    result.append(f"_mpif_product_formula\t'{product.get('formula', '')}'")
    result.append(f"_mpif_product_formula_weight\t{product.get('formulaWeight', '')}")
    result.append(f"_mpif_product_state\t'{product.get('state', '')}'")
    result.append(f"_mpif_product_color\t'{product.get('color', '')}'")
    result.append(f"_mpif_product_handling_atmosphere\t'{product.get('handlingAtmosphere', '')}'")
    result.append("_mpif_product_handling_note")
    result.append(";")
    result.append(product.get('handlingNote', ''))
    result.append(";")
    
    # Add CIF data if available
    cif_data = product.get('cif')
    if cif_data:
        result.append("_mpif_product_cif")
        result.append(";")
        # Check if CIF is a dictionary (structured) or string (raw)
        if isinstance(cif_data, dict):
            result.append(_reconstruct_cif_from_dict(cif_data))
        elif isinstance(cif_data, str):
            result.append(cif_data)
        result.append(";")
    result.append("")
    
    # Section 3: Synthesis General Information
    synthesis = data.get('synthesisGeneral', {})
    result.append("#Section 3: Synthesis General Information")
    result.append(f"_mpif_synthesis_performed_date\t{synthesis.get('performedDate', '')}")
    result.append(f"_mpif_synthesis_lab_temperature_C\t{synthesis.get('labTemperature', '')}")
    result.append(f"_mpif_synthesis_lab_humidity_percent\t{synthesis.get('labHumidity', '')}")
    result.append(f"_mpif_synthesis_type\t'{synthesis.get('reactionType', '')}'")
    
    # Conditional parameters based on type
    reaction_type = synthesis.get('reactionType', '')
    if reaction_type == 'evaporation' and synthesis.get('evaporationMethod'):
        result.append(f"_mpif_synthesis_evap_method\t'{synthesis.get('evaporationMethod')}'")
    if reaction_type == 'microwave' and synthesis.get('microwavePower') is not None:
        result.append(f"_mpif_synthesis_react_microwave_power_W\t{synthesis.get('microwavePower')}")
    if reaction_type == 'mechanochemical' and synthesis.get('mechanochemicalMethod'):
        result.append(f"_mpif_synthesis_react_mechanochem_method\t'{synthesis.get('mechanochemicalMethod')}'")
    if reaction_type == 'electrochemical':
        if synthesis.get('electrochemicalCathode'):
            result.append(f"_mpif_synthesis_react_electrochem_cathode\t{synthesis.get('electrochemicalCathode')}")
        if synthesis.get('electrochemicalAnode'):
            result.append(f"_mpif_synthesis_react_electrochem_anode\t{synthesis.get('electrochemicalAnode')}")
        if synthesis.get('electrochemicalReference'):
            result.append(f"_mpif_synthesis_react_electrochem_reference\t{synthesis.get('electrochemicalReference')}")
        if synthesis.get('electrochemicalVoltage') is not None:
            result.append(f"_mpif_synthesis_react_electrochem_voltage_V\t{synthesis.get('electrochemicalVoltage')}")
        if synthesis.get('electrochemicalCurrent') is not None:
            result.append(f"_mpif_synthesis_react_electrochem_current_A\t{synthesis.get('electrochemicalCurrent')}")
    if reaction_type == 'sonochemical':
        if synthesis.get('sonicationMethod'):
            result.append(f"_mpif_synthesis_react_sonication_method\t'{synthesis.get('sonicationMethod')}'")
        if synthesis.get('sonicationPower') is not None:
            result.append(f"_mpif_synthesis_react_sonication_power\t{synthesis.get('sonicationPower')}")
        if synthesis.get('sonicationPowerUnit'):
            result.append(f"_mpif_synthesis_react_sonication_power_unit\t'{synthesis.get('sonicationPowerUnit')}'")
    if reaction_type == 'photochemical':
        if synthesis.get('photochemicalWavelength') is not None:
            result.append(f"_mpif_synthesis_react_photochemical_wavelength_nm\t{synthesis.get('photochemicalWavelength')}")
        if synthesis.get('photochemicalPower') is not None:
            result.append(f"_mpif_synthesis_react_photochemical_power_W\t{synthesis.get('photochemicalPower')}")
        if synthesis.get('photochemicalSource'):
            result.append(f"_mpif_synthesis_react_photochemical_source\t{synthesis.get('photochemicalSource')}")
    
    result.append(f"_mpif_synthesis_react_temperature_C\t{synthesis.get('reactionTemperature', '')}")
    result.append(f"_mpif_synthesis_react_temperature_controller\t'{synthesis.get('temperatureController', '')}'")
    result.append(f"_mpif_synthesis_react_time\t{synthesis.get('reactionTime', '')}")
    result.append(f"_mpif_synthesis_react_time_unit\t'{synthesis.get('reactionTimeUnit', '')}'")
    result.append(f"_mpif_synthesis_react_atmosphere\t'{synthesis.get('reactionAtmosphere', '')}'")
    result.append(f"_mpif_synthesis_react_container\t'{synthesis.get('reactionContainer', '')}'")
    result.append("_mpif_synthesis_react_note")
    result.append(";")
    result.append(synthesis.get('reactionNote', ''))
    result.append(";")
    result.append(f"_mpif_synthesis_product_amount\t{synthesis.get('productAmount', '')}")
    result.append(f"_mpif_synthesis_product_amount_unit\t'{synthesis.get('productAmountUnit', '')}'")
    if synthesis.get('productYield'):
        result.append(f"_mpif_synthesis_product_yield_percent\t{synthesis.get('productYield')}")
    result.append(f"_mpif_synthesis_scale\t'{synthesis.get('scale', '')}'")
    result.append("_mpif_synthesis_safety_note")
    result.append(";")
    result.append(synthesis.get('safetyNote', ''))
    result.append(";")
    result.append("")
    
    # Section 4: Synthesis Details
    details = data.get('synthesisDetails', {})
    result.append("#Section 4: Synthesis Procedure Details")
    
    # Substrates
    substrates = details.get('substrates', [])
    if substrates:
        result.append(f"_mpif_substrate_number\t{len(substrates)}")
        result.append("loop_")
        result.append("_mpif_substrate_id")
        result.append("_mpif_substrate_name")
        result.append("_mpif_substrate_molarity")
        result.append("_mpif_substrate_molarity_unit")
        result.append("_mpif_substrate_amount")
        result.append("_mpif_substrate_amount_unit")
        result.append("_mpif_substrate_supplier")
        result.append("_mpif_substrate_purity_percent")
        result.append("_mpif_substrate_cas")
        result.append("_mpif_substrate_smiles")
        
        for sub in substrates:
            line = "\t".join([
                str(sub.get('id', '')),
                str(sub.get('name', '')),
                str(sub.get('molarity', '')),
                str(sub.get('molarityUnit', '')),
                str(sub.get('amount', '')),
                str(sub.get('amountUnit', '')),
                str(sub.get('supplier', '')),
                str(sub.get('purity', '')),
                str(sub.get('casNumber', '')),
                str(sub.get('smiles', '?'))
            ])
            result.append(line)
        result.append("")
    
    # Solvents
    solvents = details.get('solvents', [])
    if solvents:
        result.append(f"_mpif_solvent_number\t{len(solvents)}")
        result.append("loop_")
        result.append("_mpif_solvent_id")
        result.append("_mpif_solvent_name")
        result.append("_mpif_solvent_molarity")
        result.append("_mpif_solvent_molarity_unit")
        result.append("_mpif_solvent_amount")
        result.append("_mpif_solvent_amount_unit")
        result.append("_mpif_solvent_supplier")
        result.append("_mpif_solvent_purity_percent")
        result.append("_mpif_solvent_cas")
        result.append("_mpif_solvent_smiles")
        
        for sol in solvents:
            line = "\t".join([
                str(sol.get('id', '')),
                str(sol.get('name', '')),
                str(sol.get('molarity', '')),
                str(sol.get('molarityUnit', '')),
                str(sol.get('amount', '')),
                str(sol.get('amountUnit', '')),
                str(sol.get('supplier', '')),
                str(sol.get('purity', '')),
                str(sol.get('casNumber', '')),
                str(sol.get('smiles', '?'))
            ])
            result.append(line)
        result.append("")
    
    # Catalysts
    catalysts = details.get('catalysts', [])
    if catalysts:
        result.append(f"_mpif_catalyst_number\t{len(catalysts)}")
        result.append("loop_")
        result.append("_mpif_catalyst_id")
        result.append("_mpif_catalyst_name")
        result.append("_mpif_catalyst_amount")
        result.append("_mpif_catalyst_unit")
        result.append("_mpif_catalyst_supplier")
        result.append("_mpif_catalyst_purity_percent")
        result.append("_mpif_catalyst_cas")
        result.append("_mpif_catalyst_smiles")
        result.append("_mpif_catalyst_note")
        
        for cat in catalysts:
            line = "\t".join([
                str(cat.get('id', '')),
                str(cat.get('name', '')),
                str(cat.get('amount', '')),
                str(cat.get('unit', '')),
                str(cat.get('supplier', '')),
                str(cat.get('purity', '')),
                str(cat.get('casNumber', '')),
                str(cat.get('smiles', '?')),
                str(cat.get('note', '-'))
            ])
            result.append(line)
        result.append("")
    
    # Vessels
    vessels = details.get('vessels', [])
    if vessels:
        result.append(f"_mpif_vessel_number\t{len(vessels)}")
        result.append("loop_")
        result.append("_mpif_vessel_id")
        result.append("_mpif_vessel_volume")
        result.append("_mpif_vessel_volume_unit")
        result.append("_mpif_vessel_material")
        result.append("_mpif_vessel_type")
        result.append("_mpif_vessel_supplier")
        result.append("_mpif_vessel_purpose")
        result.append("_mpif_vessel_note")
        
        for ves in vessels:
            line = "\t".join([
                str(ves.get('id', '')),
                str(ves.get('volume', '')),
                str(ves.get('volumeUnit', '')),
                str(ves.get('material', '')),
                str(ves.get('type', '')),
                str(ves.get('supplier', '-')),
                str(ves.get('purpose', '')),
                str(ves.get('note', '-'))
            ])
            result.append(line)
        result.append("")
    
    # Hardware
    hardware = details.get('hardware', [])
    if hardware:
        result.append(f"_mpif_hardware_number\t{len(hardware)}")
        result.append("loop_")
        result.append("_mpif_hardware_id")
        result.append("_mpif_hardware_purpose")
        result.append("_mpif_hardware_general_name")
        result.append("_mpif_hardware_product_name")
        result.append("_mpif_hardware_supplier")
        result.append("_mpif_hardware_note")
        
        for hw in hardware:
            line = "\t".join([
                str(hw.get('id', '')),
                str(hw.get('purpose', '')),
                str(hw.get('generalName', '')),
                str(hw.get('productName', '')),
                str(hw.get('supplier', '')),
                str(hw.get('note', '-'))
            ])
            result.append(line)
        result.append("")
    
    # Procedure Steps
    steps = details.get('steps', [])
    if steps:
        result.append(f"_mpif_procedure_number\t{len(steps)}")
        result.append("loop_")
        result.append("_mpif_procedure_id")
        result.append("_mpif_procedure_type")
        result.append("_mpif_procedure_atmosphere")
        result.append("_mpif_procedure_detail")
        
        for step in steps:
            line = "\t".join([
                str(step.get('id', '')),
                str(step.get('type', '')),
                str(step.get('atmosphere', '')),
                str(step.get('detail', ''))
            ])
            result.append(line)
        result.append("")
    
    # Procedure full
    if details.get('procedureFull'):
        result.append("_mpif_procedure_full")
        result.append(";")
        result.append(details.get('procedureFull', ''))
        result.append(";")
        result.append("")
    
    # Characterization
    char = data.get('characterization', {})
    if char.get('pxrd') or char.get('tga') or char.get('aif'):
        result.append("#Characterization Information")
        result.append("")
        
        # PXRD
        if char.get('pxrd'):
            pxrd = char['pxrd']
            result.append("_mpif_pxrd_data")
            result.append(";")
            result.append(f"_mpif_pxrd_source\t'{pxrd.get('source', '')}'")
            if pxrd.get('wavelength'):
                result.append(f"_mpif_pxrd_lambda\t{pxrd.get('wavelength')}")
            result.append("loop_")
            result.append("_pxrd_2theta")
            result.append("_pxrd_intensity")
            for point in pxrd.get('data', []):
                result.append(f"{point.get('twoTheta', '')}\t{point.get('intensity', '')}")
            result.append(";")
            result.append("")
        
        # TGA
        if char.get('tga'):
            tga = char['tga']
            result.append("_mpif_tga_data")
            result.append(";")
            result.append("loop_")
            result.append("_tga_temperature_celcius")
            result.append("_tga_weight_percent")
            for point in tga.get('data', []):
                result.append(f"{point.get('temperature', '')}\t{point.get('weightPercent', '')}")
            result.append(";")
            result.append("")
        
        # AIF
        aif_data = char.get('aif')
        if aif_data:
            result.append("_mpif_aif")
            result.append(";")
            # Check if AIF is a dictionary (structured) or string (raw)
            if isinstance(aif_data, dict):
                result.append(_reconstruct_aif_from_dict(aif_data))
            elif isinstance(aif_data, str):
                result.append(aif_data)
            result.append(";")
    
    return "\n".join(result)


def mpif_to_json(mpif_content: str, parse_embedded_formats: bool = True) -> Dict[str, Any]:
    """
    Convert MPIF format to JSON-compatible dictionary.
    
    Args:
        mpif_content: String containing MPIF formatted data
        parse_embedded_formats: If True, parse CIF and AIF into structured objects.
                               If False, keep them as raw strings (default: True)
    
    Returns:
        dict: A dictionary with the following structure:
            - metadata: dict with creationDate, generatorVersion, etc.
            - productInfo: dict with product details (CIF parsed if parse_embedded_formats=True)
            - synthesisGeneral: dict with synthesis general information
            - synthesisDetails: dict with substrates, solvents, vessels, hardware, steps
            - characterization: dict with pxrd, tga, adsorption, desorption, aif data
                               (AIF parsed if parse_embedded_formats=True)
    
    Example:
        >>> with open('test.mpif', 'r') as f:
        ...     mpif_str = f.read()
        >>> data_dict = mpif_to_json(mpif_str)
        >>> json_str = json.dumps(data_dict, indent=2)
    """
    lines = [line.strip() for line in mpif_content.split('\n')]
    
    data = {
        'metadata': _parse_metadata(lines),
        'productInfo': _parse_product_info(lines, parse_embedded_formats),
        'synthesisGeneral': _parse_synthesis_general(lines),
        'synthesisDetails': _parse_synthesis_details(lines),
        'characterization': _parse_characterization(lines, parse_embedded_formats)
    }
    
    return data


# Helper functions for parsing

def _parse_cif_to_dict(cif_text: str) -> Dict[str, Any]:
    """
    Parse CIF text into a structured dictionary.
    
    Returns a dictionary with:
    - dataName: name of the CIF data block
    - properties: dict of simple key-value properties
    - loops: list of loop data structures with headers and data rows
    """
    lines = [line.strip() for line in cif_text.split('\n') if line.strip()]
    cif_data = {
        'dataName': '',
        'properties': {},
        'loops': []
    }
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Parse data block name
        if line.startswith('data_'):
            cif_data['dataName'] = line[5:].strip()
            i += 1
            continue
        
        # Parse loop
        if line == 'loop_':
            loop_data = {'headers': [], 'data': []}
            i += 1
            
            # Read loop headers
            while i < len(lines) and lines[i].startswith('_'):
                loop_data['headers'].append(lines[i])
                i += 1
            
            # Read loop data rows
            while i < len(lines) and not lines[i].startswith('_') and lines[i] != 'loop_':
                # Split by whitespace but handle quoted strings
                row_values = []
                parts = lines[i].split()
                for part in parts:
                    row_values.append(part)
                if row_values:
                    loop_data['data'].append(row_values)
                i += 1
            
            cif_data['loops'].append(loop_data)
            continue
        
        # Parse simple property (key-value pair)
        if line.startswith('_') and '\t' not in line:
            parts = line.split(None, 1)  # Split on first whitespace
            if len(parts) == 2:
                key = parts[0]
                value = parts[1]
                cif_data['properties'][key] = value
            elif len(parts) == 1:
                # Value might be on next line
                key = parts[0]
                if i + 1 < len(lines) and not lines[i + 1].startswith('_'):
                    cif_data['properties'][key] = lines[i + 1]
                    i += 1
            i += 1
            continue
        
        # Skip comments and empty lines
        if line.startswith('#') or not line:
            i += 1
            continue
        
        i += 1
    
    return cif_data


def _parse_aif_to_dict(aif_text: str) -> Dict[str, Any]:
    """
    Parse AIF (Adsorption Information File) text into a structured dictionary.
    
    Returns a dictionary with:
    - dataName: name of the data block
    - properties: dict of metadata properties
    - adsorptionData: list of adsorption measurements
    - desorptionData: list of desorption measurements (if present)
    """
    lines = [line.strip() for line in aif_text.split('\n') if line.strip()]
    aif_data = {
        'dataName': '',
        'properties': {},
        'adsorptionData': [],
        'desorptionData': []
    }
    
    i = 0
    current_loop_type = None
    
    while i < len(lines):
        line = lines[i]
        
        # Parse data block name
        if line.startswith('data_'):
            aif_data['dataName'] = line[5:].strip()
            i += 1
            continue
        
        # Parse property (key-value pair)
        if line.startswith('_') and 'loop_' not in line and not line.startswith('_adsorp_') and not line.startswith('_desorp_'):
            parts = line.split(None, 1)  # Split on first whitespace
            if len(parts) == 2:
                key = parts[0]
                value = parts[1]
                # Clean up key name
                clean_key = key[1:]  # Remove leading underscore
                aif_data['properties'][clean_key] = value
            i += 1
            continue
        
        # Parse loop data
        if line == 'loop_':
            i += 1
            loop_headers = []
            
            # Read headers
            while i < len(lines) and lines[i].startswith('_'):
                loop_headers.append(lines[i])
                i += 1
            
            # Determine if this is adsorption or desorption
            if any('_adsorp_' in h for h in loop_headers):
                current_loop_type = 'adsorption'
            elif any('_desorp_' in h for h in loop_headers):
                current_loop_type = 'desorption'
            
            # Read data rows
            while i < len(lines) and not lines[i].startswith('_') and lines[i] != 'loop_':
                parts = lines[i].split()
                if len(parts) >= 2:
                    try:
                        data_point = {
                            'pressure': float(parts[0]),
                            'loading': float(parts[1])
                        }
                        if len(parts) >= 3:
                            data_point['p0'] = float(parts[2])
                        
                        if current_loop_type == 'adsorption':
                            aif_data['adsorptionData'].append(data_point)
                        elif current_loop_type == 'desorption':
                            aif_data['desorptionData'].append(data_point)
                    except ValueError:
                        pass
                i += 1
            continue
        
        i += 1
    
    return aif_data


def _reconstruct_cif_from_dict(cif_dict: Dict[str, Any]) -> str:
    """Reconstruct CIF text from parsed dictionary."""
    if not cif_dict:
        return ''
    
    lines = []
    
    # Data block name
    if cif_dict.get('dataName'):
        lines.append(f"data_{cif_dict['dataName']}")
    
    # Properties
    for key, value in cif_dict.get('properties', {}).items():
        lines.append(f"{key}   {value}")
    
    # Loops
    for loop in cif_dict.get('loops', []):
        lines.append('loop_')
        for header in loop.get('headers', []):
            lines.append(f" {header}")
        for row in loop.get('data', []):
            lines.append('  ' + '  '.join(str(v) for v in row))
        lines.append('')
    
    return '\n'.join(lines)


def _reconstruct_aif_from_dict(aif_dict: Dict[str, Any]) -> str:
    """Reconstruct AIF text from parsed dictionary."""
    if not aif_dict:
        return ''
    
    lines = []
    
    # Data block name
    if aif_dict.get('dataName'):
        lines.append(f"data_{aif_dict['dataName']}")
        lines.append('')
    
    # Properties
    for key, value in aif_dict.get('properties', {}).items():
        lines.append(f"_{key}           {value}")
    
    if aif_dict.get('properties'):
        lines.append('')
    
    # Adsorption data
    if aif_dict.get('adsorptionData'):
        lines.append('loop_')
        lines.append('_adsorp_pressure')
        lines.append('_adsorp_loading')
        for point in aif_dict['adsorptionData']:
            lines.append(f"{point['pressure']}    {point['loading']}")
        lines.append('')
    
    # Desorption data
    if aif_dict.get('desorptionData'):
        lines.append('loop_')
        lines.append('_desorp_pressure')
        lines.append('_desorp_loading')
        for point in aif_dict['desorptionData']:
            lines.append(f"{point['pressure']}    {point['loading']}")
        lines.append('')
    
    return '\n'.join(lines)


def _find_value(lines: List[str], key: str) -> Optional[str]:
    """Find value for a given key in MPIF format."""
    for line in lines:
        if line.startswith(key):
            parts = line.split('\t', 1)
            if len(parts) > 1:
                return parts[1].strip().strip("'")
    return None


def _extract_text_block(lines: List[str], key: str) -> Optional[str]:
    """Extract text block (between semicolons) for a given key."""
    start_idx = None
    for i, line in enumerate(lines):
        if line.startswith(key):
            start_idx = i
            break
    
    if start_idx is None:
        return None
    
    content = []
    in_block = False
    
    for i in range(start_idx + 1, len(lines)):
        line = lines[i]
        if line == ';':
            if in_block:
                break  # End of block
            else:
                in_block = True  # Start of block
        elif in_block:
            content.append(line)
    
    return '\n'.join(content) if content else None


def _parse_metadata(lines: List[str]) -> Dict[str, Any]:
    """Parse metadata section from MPIF."""
    metadata = {}
    
    # Parse data block name
    for line in lines:
        if line.startswith('data_'):
            metadata['dataName'] = line[5:]
            break
    
    metadata['creationDate'] = _find_value(lines, '_mpif_audit_creation_date') or ''
    metadata['generatorVersion'] = _find_value(lines, '_mpif_audit_generator_version') or ''
    metadata['publicationDOI'] = _find_value(lines, '_mpif_audit_publication_doi') or ''
    metadata['procedureStatus'] = _find_value(lines, '_mpif_audit_procedure_status') or 'test'
    
    # Author details
    metadata['name'] = _find_value(lines, '_mpif_audit_contact_author_name') or ''
    metadata['email'] = _find_value(lines, '_mpif_audit_contact_author_email') or ''
    metadata['orcid'] = _find_value(lines, '_mpif_audit_contact_author_id_orcid') or ''
    metadata['address'] = _find_value(lines, '_mpif_audit_contact_author_address') or ''
    metadata['phone'] = _find_value(lines, '_mpif_audit_contact_author_phone') or ''
    
    return metadata


def _parse_product_info(lines: List[str], parse_cif: bool = True) -> Dict[str, Any]:
    """Parse product information from MPIF."""
    product = {}
    
    product['type'] = _find_value(lines, '_mpif_product_type') or ''
    product['casNumber'] = _find_value(lines, '_mpif_product_cas')
    product['ccdcNumber'] = _find_value(lines, '_mpif_product_ccdc')
    product['commonName'] = _find_value(lines, '_mpif_product_name_common') or ''
    product['systematicName'] = _find_value(lines, '_mpif_product_name_systematic')
    product['formula'] = _find_value(lines, '_mpif_product_formula')
    
    fw_str = _find_value(lines, '_mpif_product_formula_weight')
    product['formulaWeight'] = float(fw_str) if fw_str and fw_str != '' else None
    
    product['state'] = _find_value(lines, '_mpif_product_state') or ''
    product['color'] = _find_value(lines, '_mpif_product_color') or ''
    product['handlingAtmosphere'] = _find_value(lines, '_mpif_product_handling_atmosphere') or ''
    product['handlingNote'] = _extract_text_block(lines, '_mpif_product_handling_note')
    
    # Handle CIF data
    cif_text = _extract_text_block(lines, '_mpif_product_cif')
    if cif_text:
        if parse_cif:
            product['cif'] = _parse_cif_to_dict(cif_text)
        else:
            product['cif'] = cif_text
    
    return product


def _parse_synthesis_general(lines: List[str]) -> Dict[str, Any]:
    """Parse synthesis general information from MPIF."""
    synthesis = {}
    
    synthesis['performedDate'] = _find_value(lines, '_mpif_synthesis_performed_date') or ''
    
    lab_temp = _find_value(lines, '_mpif_synthesis_lab_temperature_C')
    synthesis['labTemperature'] = float(lab_temp) if lab_temp else None
    
    lab_hum = _find_value(lines, '_mpif_synthesis_lab_humidity_percent')
    synthesis['labHumidity'] = float(lab_hum) if lab_hum else None
    
    synthesis['reactionType'] = _find_value(lines, '_mpif_synthesis_type') or ''
    
    # Conditional parameters based on type
    reaction_type = synthesis['reactionType']
    if reaction_type == 'evaporation':
        synthesis['evaporationMethod'] = _find_value(lines, '_mpif_synthesis_evap_method')
    if reaction_type == 'microwave':
        mw_power = _find_value(lines, '_mpif_synthesis_react_microwave_power_W')
        synthesis['microwavePower'] = float(mw_power) if mw_power else None
    if reaction_type == 'mechanochemical':
        synthesis['mechanochemicalMethod'] = _find_value(lines, '_mpif_synthesis_react_mechanochem_method')
    if reaction_type == 'electrochemical':
        synthesis['electrochemicalCathode'] = _find_value(lines, '_mpif_synthesis_react_electrochem_cathode')
        synthesis['electrochemicalAnode'] = _find_value(lines, '_mpif_synthesis_react_electrochem_anode')
        synthesis['electrochemicalReference'] = _find_value(lines, '_mpif_synthesis_react_electrochem_reference')
        voltage = _find_value(lines, '_mpif_synthesis_react_electrochem_voltage_V')
        synthesis['electrochemicalVoltage'] = float(voltage) if voltage else None
        current = _find_value(lines, '_mpif_synthesis_react_electrochem_current_A')
        synthesis['electrochemicalCurrent'] = float(current) if current else None
    if reaction_type == 'sonochemical':
        synthesis['sonicationMethod'] = _find_value(lines, '_mpif_synthesis_react_sonication_method')
        son_power = _find_value(lines, '_mpif_synthesis_react_sonication_power')
        synthesis['sonicationPower'] = float(son_power) if son_power else None
        synthesis['sonicationPowerUnit'] = _find_value(lines, '_mpif_synthesis_react_sonication_power_unit')
    if reaction_type == 'photochemical':
        wavelength = _find_value(lines, '_mpif_synthesis_react_photochemical_wavelength_nm')
        synthesis['photochemicalWavelength'] = float(wavelength) if wavelength else None
        power = _find_value(lines, '_mpif_synthesis_react_photochemical_power_W')
        synthesis['photochemicalPower'] = float(power) if power else None
        synthesis['photochemicalSource'] = _find_value(lines, '_mpif_synthesis_react_photochemical_source')
    
    react_temp = _find_value(lines, '_mpif_synthesis_react_temperature_C')
    synthesis['reactionTemperature'] = float(react_temp) if react_temp else None
    
    synthesis['temperatureController'] = _find_value(lines, '_mpif_synthesis_react_temperature_controller') or ''
    
    react_time = _find_value(lines, '_mpif_synthesis_react_time')
    synthesis['reactionTime'] = float(react_time) if react_time else None
    
    synthesis['reactionTimeUnit'] = _find_value(lines, '_mpif_synthesis_react_time_unit') or ''
    synthesis['reactionAtmosphere'] = _find_value(lines, '_mpif_synthesis_react_atmosphere') or ''
    synthesis['reactionContainer'] = _find_value(lines, '_mpif_synthesis_react_container') or ''
    synthesis['reactionNote'] = _extract_text_block(lines, '_mpif_synthesis_react_note')
    
    prod_amount = _find_value(lines, '_mpif_synthesis_product_amount')
    synthesis['productAmount'] = float(prod_amount) if prod_amount else None
    
    synthesis['productAmountUnit'] = _find_value(lines, '_mpif_synthesis_product_amount_unit') or ''
    
    prod_yield = _find_value(lines, '_mpif_synthesis_product_yield_percent')
    synthesis['productYield'] = float(prod_yield) if prod_yield else None
    
    synthesis['scale'] = _find_value(lines, '_mpif_synthesis_scale') or ''
    synthesis['safetyNote'] = _extract_text_block(lines, '_mpif_synthesis_safety_note')
    
    return synthesis


def _parse_loop_data(lines: List[str], loop_type: str, fields: List[str]) -> List[Dict[str, Any]]:
    """Parse loop data from MPIF format."""
    # Find the count
    count_key = f'_mpif_{loop_type}_number'
    count_str = _find_value(lines, count_key)
    if not count_str:
        return []
    
    count = int(count_str)
    if count == 0:
        return []
    
    # Find the start of the loop
    loop_start = None
    for i, line in enumerate(lines):
        if line.startswith(f'_mpif_{loop_type}_id'):
            loop_start = i
            break
    
    if loop_start is None:
        return []
    
    # Skip header lines to get to data
    data_start = loop_start
    for i in range(loop_start, len(lines)):
        line = lines[i]
        if not line.startswith('_mpif_') and not line.startswith('loop_') and line.strip() != '':
            data_start = i
            break
    
    # Parse data rows
    results = []
    items_parsed = 0
    
    for i in range(data_start, len(lines)):
        if items_parsed >= count:
            break
        
        line = lines[i]
        
        # Stop if we hit a new section
        if line.startswith('_mpif_') or line.startswith('#') or line == '':
            break
        
        values = line.split('\t')
        if len(values) < len(fields):
            continue
        
        item = {}
        for j, field in enumerate(fields):
            value = values[j].strip() if j < len(values) else ''
            
            # Type conversion
            if field in ['molarity', 'amount', 'purity', 'volume']:
                try:
                    item[field] = float(value) if value and value not in ['?', '-', ''] else None
                except ValueError:
                    item[field] = None
            else:
                item[field] = value if value not in ['?', '-', ''] else None
        
        results.append(item)
        items_parsed += 1
    
    return results


def _parse_synthesis_details(lines: List[str]) -> Dict[str, Any]:
    """Parse synthesis details from MPIF."""
    details = {}
    
    details['substrates'] = _parse_loop_data(lines, 'substrate', [
        'id', 'name', 'molarity', 'molarityUnit', 'amount', 'amountUnit',
        'supplier', 'purity', 'casNumber', 'smiles'
    ])
    
    details['solvents'] = _parse_loop_data(lines, 'solvent', [
        'id', 'name', 'molarity', 'molarityUnit', 'amount', 'amountUnit',
        'supplier', 'purity', 'casNumber', 'smiles'
    ])
    
    details['catalysts'] = _parse_loop_data(lines, 'catalyst', [
        'id', 'name', 'amount', 'unit', 'supplier', 'purity', 'casNumber', 'smiles', 'note'
    ])
    
    details['vessels'] = _parse_loop_data(lines, 'vessel', [
        'id', 'volume', 'volumeUnit', 'material', 'type', 'supplier', 'purpose', 'note'
    ])
    
    details['hardware'] = _parse_loop_data(lines, 'hardware', [
        'id', 'purpose', 'generalName', 'productName', 'supplier', 'note'
    ])
    
    details['steps'] = _parse_loop_data(lines, 'procedure', [
        'id', 'type', 'atmosphere', 'detail'
    ])
    
    details['procedureFull'] = _extract_text_block(lines, '_mpif_procedure_full')
    
    return details


def _parse_characterization(lines: List[str], parse_aif: bool = True) -> Dict[str, Any]:
    """Parse characterization data from MPIF."""
    char = {}
    
    # Parse PXRD
    pxrd_idx = None
    for i, line in enumerate(lines):
        if line.startswith('_mpif_pxrd_data'):
            pxrd_idx = i
            break
    
    if pxrd_idx is not None:
        pxrd = {'data': []}
        in_loop_data = False
        found_data_end = False
        
        for i in range(pxrd_idx + 1, len(lines)):
            if found_data_end:
                break
            
            line = lines[i]
            
            if line == ';' and in_loop_data:
                found_data_end = True
            elif '_mpif_pxrd_source' in line:
                pxrd['source'] = line.split('\t')[1].strip().strip("'")
            elif '_mpif_pxrd_lambda' in line:
                pxrd['wavelength'] = float(line.split('\t')[1])
            elif '_pxrd_2theta' in line or '_pxrd_intensity' in line:
                in_loop_data = True
            elif in_loop_data and '\t' in line and not line.startswith('_'):
                parts = line.split('\t')
                if len(parts) >= 2:
                    try:
                        pxrd['data'].append({
                            'twoTheta': float(parts[0]),
                            'intensity': float(parts[1])
                        })
                    except ValueError:
                        pass
            elif line.startswith('_mpif_') and in_loop_data:
                found_data_end = True
        
        if pxrd['data']:
            char['pxrd'] = pxrd
    
    # Parse TGA
    tga_idx = None
    for i, line in enumerate(lines):
        if line.startswith('_mpif_tga_data'):
            tga_idx = i
            break
    
    if tga_idx is not None:
        tga = {'data': []}
        in_loop_data = False
        found_data_end = False
        
        for i in range(tga_idx + 1, len(lines)):
            if found_data_end:
                break
            
            line = lines[i]
            
            if line == ';' and in_loop_data:
                found_data_end = True
            elif '_tga_temperature_celcius' in line or '_tga_weight_percent' in line:
                in_loop_data = True
            elif in_loop_data and '\t' in line and not line.startswith('_'):
                parts = line.split('\t')
                if len(parts) >= 2:
                    try:
                        tga['data'].append({
                            'temperature': float(parts[0]),
                            'weightPercent': float(parts[1])
                        })
                    except ValueError:
                        pass
            elif line.startswith('_mpif_') and in_loop_data:
                found_data_end = True
        
        if tga['data']:
            char['tga'] = tga
    
    # Parse AIF
    aif_text = _extract_text_block(lines, '_mpif_aif')
    if aif_text:
        if parse_aif:
            char['aif'] = _parse_aif_to_dict(aif_text)
        else:
            char['aif'] = aif_text
    
    return char


def create_mpif_json(**kwargs) -> Dict[str, Any]:
    """
    Create MPIF JSON structure from variable arguments.
    
    This function provides a flexible way to build MPIF data structures by accepting
    any combination of MPIF sections and fields as keyword arguments.
    
    Args:
        **kwargs: Variable keyword arguments that can include:
            - Any top-level section: metadata, productInfo, synthesisGeneral, 
              synthesisDetails, characterization
            - Individual fields that will be organized into appropriate sections
            - File paths: mpif_file, json_file to load data from files
            - Characterization data: pxrd_data, pxrd_source, pxrd_wavelength,
              tga_data, aif_data, aif_properties, cif_dict, cif_string
    
    Returns:
        dict: Complete MPIF data structure
    
    Examples:
        # Create from individual fields (auto-organized, IDs auto-generated)
        data = create_mpif_json(
            dataName='test',
            commonName='MOF-5',
            reactionType='mix',
            substrates=[{'name': 'Linker', 'amount': 50, 'amountUnit': 'mg'}],
            pxrd_data={'twoTheta': [5, 10], 'intensity': [1000, 5000]},
            pxrd_source='Cu',
            tga_data={'temperature': [25, 100], 'weightPercent': [100, 99.8]}
        )
        
        # Load from file and update
        data = create_mpif_json(
            mpif_file='test.mpif',
            commonName='New-Name'
        )
    """
    # Initialize default structure
    data = {
        'metadata': {},
        'productInfo': {},
        'synthesisGeneral': {},
        'synthesisDetails': {
            'substrates': [],
            'solvents': [],
            'catalysts': [],
            'vessels': [],
            'hardware': [],
            'steps': [],
        },
        'characterization': {}
    }
    
    # Handle file loading
    if 'mpif_file' in kwargs:
        with open(kwargs['mpif_file'], 'r') as f:
            data = mpif_to_json(f.read(), kwargs.get('parse_embedded_formats', True))
        del kwargs['mpif_file']
        if 'parse_embedded_formats' in kwargs:
            del kwargs['parse_embedded_formats']
    
    if 'json_file' in kwargs:
        import json as json_module
        with open(kwargs['json_file'], 'r') as f:
            loaded_data = json_module.load(f)
            # Deep merge
            for key in data:
                if key in loaded_data:
                    if isinstance(data[key], dict) and isinstance(loaded_data[key], dict):
                        data[key].update(loaded_data[key])
                    else:
                        data[key] = loaded_data[key]
        del kwargs['json_file']
    
    # Map of field names to their sections
    field_map = {
        # Metadata fields
        'dataName': 'metadata',
        'creationDate': 'metadata',
        'generatorVersion': 'metadata',
        'publicationDOI': 'metadata',
        'procedureStatus': 'metadata',
        'name': 'metadata',
        'email': 'metadata',
        'orcid': 'metadata',
        'address': 'metadata',
        'phone': 'metadata',
        
        # Product info fields
        'type': 'productInfo',
        'casNumber': 'productInfo',
        'ccdcNumber': 'productInfo',
        'commonName': 'productInfo',
        'systematicName': 'productInfo',
        'formula': 'productInfo',
        'formulaWeight': 'productInfo',
        'state': 'productInfo',
        'color': 'productInfo',
        'handlingAtmosphere': 'productInfo',
        'handlingNote': 'productInfo',
        'cif': 'productInfo',
        
        # Synthesis general fields
        'performedDate': 'synthesisGeneral',
        'labTemperature': 'synthesisGeneral',
        'labHumidity': 'synthesisGeneral',
        'reactionType': 'synthesisGeneral',
        'reactionTemperature': 'synthesisGeneral',
        'temperatureController': 'synthesisGeneral',
        'reactionTime': 'synthesisGeneral',
        'reactionTimeUnit': 'synthesisGeneral',
        'reactionAtmosphere': 'synthesisGeneral',
        'reactionContainer': 'synthesisGeneral',
        'reactionNote': 'synthesisGeneral',
        'productAmount': 'synthesisGeneral',
        'productAmountUnit': 'synthesisGeneral',
        'productYield': 'synthesisGeneral',
        'scale': 'synthesisGeneral',
        'safetyNote': 'synthesisGeneral',
        'evaporationMethod': 'synthesisGeneral',
        'microwavePower': 'synthesisGeneral',
        'mechanochemicalMethod': 'synthesisGeneral',
        'electrochemicalCathode': 'synthesisGeneral',
        'electrochemicalAnode': 'synthesisGeneral',
        'electrochemicalReference': 'synthesisGeneral',
        'electrochemicalVoltage': 'synthesisGeneral',
        'electrochemicalCurrent': 'synthesisGeneral',
        'sonicationMethod': 'synthesisGeneral',
        'sonicationPower': 'synthesisGeneral',
        'sonicationPowerUnit': 'synthesisGeneral',
        'photochemicalWavelength': 'synthesisGeneral',
        'photochemicalPower': 'synthesisGeneral',
        'photochemicalSource': 'synthesisGeneral',
        
        # Synthesis details fields
        'substrates': 'synthesisDetails',
        'solvents': 'synthesisDetails',
        'catalysts': 'synthesisDetails',
        'vessels': 'synthesisDetails',
        'hardware': 'synthesisDetails',
        'steps': 'synthesisDetails',
        'procedureFull': 'synthesisDetails',
        
        # Characterization fields
        'pxrd': 'characterization',
        'tga': 'characterization',
        'adsorption': 'characterization',
        'desorption': 'characterization',
        'aif': 'characterization',
    }
    
    # Process top-level section updates
    for section in ['metadata', 'productInfo', 'synthesisGeneral', 'synthesisDetails', 'characterization']:
        if section in kwargs:
            if isinstance(kwargs[section], dict):
                data[section].update(kwargs[section])
            else:
                data[section] = kwargs[section]
    
    # Process individual field updates
    for key, value in kwargs.items():
        if key in field_map:
            section = field_map[key]
            data[section][key] = value
        elif key not in ['metadata', 'productInfo', 'synthesisGeneral', 'synthesisDetails', 'characterization']:
            # Unknown field - try to place it intelligently or warn
            pass
    
    # Auto-generate IDs for arrays if not provided
    if data['synthesisDetails']['substrates']:
        for i, substrate in enumerate(data['synthesisDetails']['substrates']):
            if 'id' not in substrate or not substrate['id']:
                substrate['id'] = f'R{i+1}'
    
    if data['synthesisDetails']['solvents']:
        for i, solvent in enumerate(data['synthesisDetails']['solvents']):
            if 'id' not in solvent or not solvent['id']:
                solvent['id'] = f'S{i+1}'
    
    if data['synthesisDetails'].get('catalysts'):
        for i, catalyst in enumerate(data['synthesisDetails']['catalysts']):
            if 'id' not in catalyst or not catalyst['id']:
                catalyst['id'] = f'C{i+1}'
    
    if data['synthesisDetails']['vessels']:
        for i, vessel in enumerate(data['synthesisDetails']['vessels']):
            if 'id' not in vessel or not vessel['id']:
                vessel['id'] = f'V{i+1}'
    
    if data['synthesisDetails']['hardware']:
        for i, hw in enumerate(data['synthesisDetails']['hardware']):
            if 'id' not in hw or not hw['id']:
                hw['id'] = f'H{i+1}'
    
    if data['synthesisDetails']['steps']:
        for i, step in enumerate(data['synthesisDetails']['steps']):
            if 'id' not in step or not step['id']:
                step['id'] = f'P{i+1}'
    
    # Handle characterization data if provided
    char_keys = ['pxrd_data', 'pxrd_df', 'pxrd_source', 'pxrd_wavelength',
                 'tga_data', 'tga_df',
                 'aif_data', 'aif_df', 'aif_properties']
    
    char_kwargs = {k: v for k, v in kwargs.items() if k in char_keys}
    
    if char_kwargs:
        # Load characterization data (PXRD, TGA, AIF)
        char_data = load_characterization_data(**char_kwargs)
        # Merge with existing characterization data
        if not data['characterization']:
            data['characterization'] = char_data
        else:
            data['characterization'].update(char_data)
    
    # Handle CIF data separately (goes to productInfo, not characterization)
    if 'cif_dict' in kwargs:
        data['productInfo']['cif'] = kwargs['cif_dict']
    elif 'cif_string' in kwargs:
        data['productInfo']['cif'] = kwargs['cif_string']
    
    return data


def convert_to_json(*args, **kwargs) -> Union[str, Dict[str, Any]]:
    """
    Flexible function to convert various inputs to MPIF JSON.
    
    This function can handle:
    - MPIF file content (string)
    - File paths
    - Dictionary updates
    - Variable arguments for building data
    
    Args:
        *args: Positional arguments:
            - If string starting with 'data_' or containing MPIF tags: treated as MPIF content
            - If string ending with '.mpif': treated as file path
            - If dict: treated as base data to update
        **kwargs: Keyword arguments passed to create_mpif_json() or parsing options
    
    Returns:
        dict or str: MPIF data structure (dict) or JSON string if return_string=True
    
    Examples:
        # From MPIF content string
        data = convert_to_json(mpif_content_string)
        
        # From MPIF file path
        data = convert_to_json('test.mpif')
        
        # From file path with specific parsing
        data = convert_to_json('test.mpif', parse_embedded_formats=True)
        
        # Build from scratch with fields
        data = convert_to_json(
            dataName='test',
            commonName='MOF-5',
            reactionType='mix'
        )
        
        # Load file and override fields
        data = convert_to_json('test.mpif', commonName='New-Name')
        
        # Return as JSON string
        json_str = convert_to_json('test.mpif', return_string=True)
    """
    import os
    
    return_string = kwargs.pop('return_string', False)
    parse_embedded_formats = kwargs.pop('parse_embedded_formats', True)
    
    data = None
    
    # Process positional arguments
    if len(args) == 1:
        arg = args[0]
        
        if isinstance(arg, str):
            # Check if it's a file path
            if arg.endswith('.mpif') and os.path.isfile(arg):
                with open(arg, 'r') as f:
                    content = f.read()
                data = mpif_to_json(content, parse_embedded_formats)
            # Check if it's MPIF content
            elif 'data_' in arg or '_mpif_' in arg:
                data = mpif_to_json(arg, parse_embedded_formats)
            # Otherwise treat as file path
            elif os.path.isfile(arg):
                with open(arg, 'r') as f:
                    content = f.read()
                data = mpif_to_json(content, parse_embedded_formats)
            else:
                raise ValueError(f"Invalid input: {arg}")
        
        elif isinstance(arg, dict):
            data = arg.copy()
    
    # If no positional args or we need to update, use create_mpif_json
    if data is None:
        data = create_mpif_json(**kwargs)
    elif kwargs:
        # Update existing data with kwargs
        update_data = create_mpif_json(**kwargs)
        for section in data:
            if section in update_data and isinstance(data[section], dict):
                data[section].update(update_data[section])
    
    # Return as JSON string if requested
    if return_string:
        import json as json_module
        return json_module.dumps(data, indent=2)
    
    return data


def load_characterization_data(**kwargs) -> Dict[str, Any]:
    """
    Load characterization data from various sources (DataFrames, arrays, dicts).
    
    This function makes it easy to add characterization data (PXRD, TGA, AIF) 
    from common data sources like pandas DataFrames, numpy arrays, or lists.
    
    Note: CIF data should be passed directly to create_mpif_json() via cif_dict 
    or cif_string parameters.
    
    Args:
        **kwargs: Characterization data in various formats:
            - pxrd_df: DataFrame with columns ['twoTheta', 'intensity']
            - pxrd_data: List of [twoTheta, intensity] pairs or dict
            - pxrd_source: X-ray source (e.g., 'Cu', 'Mo')
            - pxrd_wavelength: Wavelength in Angstroms
            
            - tga_df: DataFrame with columns ['temperature', 'weightPercent']
            - tga_data: List of [temperature, weight%] pairs or dict
            
            - aif_df: DataFrame with columns ['pressure', 'loading', 'p0' (optional)]
            - aif_data: Dict with 'properties' and 'adsorptionData'
            - aif_properties: Dict of AIF metadata (sample_id, temperature_K, etc.)
    
    Returns:
        dict: Characterization section compatible with MPIF structure
    
    Examples:
        # From pandas DataFrame
        import pandas as pd
        pxrd_df = pd.DataFrame({
            'twoTheta': [5, 10, 15, 20],
            'intensity': [1000, 5000, 3000, 8000]
        })
        char = load_characterization_data(
            pxrd_df=pxrd_df,
            pxrd_source='Cu',
            pxrd_wavelength=1.54056
        )
        
        # From lists/arrays
        tga_temps = [25, 100, 200, 300, 400]
        tga_weights = [100, 99.8, 99.5, 98, 85]
        char = load_characterization_data(
            tga_data={'temperature': tga_temps, 'weightPercent': tga_weights}
        )
        
        # Multiple characterization types at once
        char = load_characterization_data(
            pxrd_df=pxrd_df,
            pxrd_source='Cu',
            tga_df=tga_df,
            aif_data=aif_dict
        )
    """
    characterization = {}
    
    # Handle PXRD data
    if 'pxrd_df' in kwargs or 'pxrd_data' in kwargs:
        pxrd = {}
        
        # Source and wavelength
        if 'pxrd_source' in kwargs:
            pxrd['source'] = kwargs['pxrd_source']
        if 'pxrd_wavelength' in kwargs:
            pxrd['wavelength'] = kwargs['pxrd_wavelength']
        
        # Data from DataFrame
        if 'pxrd_df' in kwargs:
            df = kwargs['pxrd_df']
            pxrd['data'] = []
            for _, row in df.iterrows():
                pxrd['data'].append({
                    'twoTheta': float(row['twoTheta']),
                    'intensity': float(row['intensity'])
                })
        
        # Data from dict or list
        elif 'pxrd_data' in kwargs:
            data = kwargs['pxrd_data']
            pxrd['data'] = []
            if isinstance(data, dict):
                # Assume dict with 'twoTheta' and 'intensity' keys
                for i in range(len(data['twoTheta'])):
                    pxrd['data'].append({
                        'twoTheta': float(data['twoTheta'][i]),
                        'intensity': float(data['intensity'][i])
                    })
            elif isinstance(data, list):
                # List of [twoTheta, intensity] pairs
                for point in data:
                    pxrd['data'].append({
                        'twoTheta': float(point[0]),
                        'intensity': float(point[1])
                    })
        
        if pxrd.get('data'):
            characterization['pxrd'] = pxrd
    
    # Handle TGA data
    if 'tga_df' in kwargs or 'tga_data' in kwargs:
        tga = {'data': []}
        
        # Data from DataFrame
        if 'tga_df' in kwargs:
            df = kwargs['tga_df']
            for _, row in df.iterrows():
                tga['data'].append({
                    'temperature': float(row['temperature']),
                    'weightPercent': float(row['weightPercent'])
                })
        
        # Data from dict or list
        elif 'tga_data' in kwargs:
            data = kwargs['tga_data']
            if isinstance(data, dict):
                for i in range(len(data['temperature'])):
                    tga['data'].append({
                        'temperature': float(data['temperature'][i]),
                        'weightPercent': float(data['weightPercent'][i])
                    })
            elif isinstance(data, list):
                for point in data:
                    tga['data'].append({
                        'temperature': float(point[0]),
                        'weightPercent': float(point[1])
                    })
        
        if tga['data']:
            characterization['tga'] = tga
    
    # Handle AIF data
    if 'aif_df' in kwargs or 'aif_data' in kwargs:
        aif = {
            'dataName': '',
            'properties': kwargs.get('aif_properties', {}),
            'adsorptionData': [],
            'desorptionData': []
        }
        
        # Data from DataFrame
        if 'aif_df' in kwargs:
            df = kwargs['aif_df']
            for _, row in df.iterrows():
                point = {
                    'pressure': float(row['pressure']),
                    'loading': float(row['loading'])
                }
                if 'p0' in row:
                    point['p0'] = float(row['p0'])
                aif['adsorptionData'].append(point)
        
        # Data from dict
        elif 'aif_data' in kwargs:
            data = kwargs['aif_data']
            if isinstance(data, dict):
                if 'properties' in data:
                    aif['properties'].update(data['properties'])
                if 'dataName' in data:
                    aif['dataName'] = data['dataName']
                if 'adsorptionData' in data:
                    aif['adsorptionData'] = data['adsorptionData']
                if 'desorptionData' in data:
                    aif['desorptionData'] = data['desorptionData']
        
        if aif['adsorptionData'] or aif['desorptionData']:
            characterization['aif'] = aif
    
    # Handle CIF data
    if 'cif_dict' in kwargs:
        characterization['cif'] = kwargs['cif_dict']
    elif 'cif_string' in kwargs:
        characterization['cif'] = kwargs['cif_string']
    
    return characterization
