const { supabase } = require('../lib/supabase');
const { calculatePriority } = require('../priority');

class SupabaseRepository {
  generateId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `INC-${suffix}`;
  }

  _mapFromRow(row) {
    if (!row) return null;

    const citizen = row.citizens || null;

    return {
      id: row.id,
      citizenId: row.citizen_id || null,
      title: row.title,
      description: row.description,
      category: row.category,
      location: row.address_text || '',
      latitude: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
      longitude: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
      peopleAffected: row.people_affected !== undefined ? Number(row.people_affected) : 0,
      contactName: citizen?.name || row.contactName || '',
      contactPhone: citizen?.phone || row.contactPhone || '',
      contactEmail: row.contactEmail || '',
      peopleTrapped: row.trapped ? 'Yes' : 'No',
      immediateDanger: row.immediate_danger ? 'Yes' : 'No',
      injuries: row.injuries || 'Unknown',
      severity: row.rule_severity || 'Low',
      severityScore: row.rule_score !== undefined ? Number(row.rule_score) : 0,
      severityReasons: Array.isArray(row.rule_reasons) ? row.rule_reasons : [],
      severityOverride: row.severity_override || null,
      finalSeverity: row.final_severity || row.severity_override || row.rule_severity || 'Low',
      isDraft: !!row.is_draft || row.status === 'Draft',
      needsHumanReview: !!row.needs_human_review,
      aiStatus: row.ai_status || 'none',
      aiSeverity: row.ai_severity || null,
      aiConfidence: row.ai_confidence !== null && row.ai_confidence !== undefined ? Number(row.ai_confidence) : null,
      aiAnalysis: row.ai_analysis || null,
      status: row.status === 'Pending' || !row.status ? 'Reported' : row.status,
      assignedTeamId: row.assigned_team_id || null,
      assignedAt: row.assigned_at || null,
      priorityScore: row.priority_score === undefined ? 0 : Number(row.priority_score),
      priorityLabel: row.priority_label || null,
      priorityBreakdown: row.priority_breakdown || [],
      statusHistory: Array.isArray(row.status_history) ? row.status_history.map(h => h.status === 'Pending' ? { ...h, status: 'Reported' } : h) : [],
      isSample: !!row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _mapToRow(data) {
    const now = new Date().toISOString();
    const ruleSeverity = data.severity || 'Low';
    const override = data.severityOverride !== undefined ? data.severityOverride : null;
    const finalSeverity = override || ruleSeverity;

    const row = {
      title: data.title,
      description: data.description,
      category: data.category,
      address_text: data.location || data.address_text || '',
      people_affected: data.peopleAffected !== undefined ? Number(data.peopleAffected) : 0,
      trapped: data.peopleTrapped === 'Yes' || data.peopleTrapped === true || data.trapped === true,
      immediate_danger: data.immediateDanger === 'Yes' || data.immediateDanger === true || data.immediate_danger === true,
      injuries: data.injuries || 'Unknown',
      lat: data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : (data.lat !== undefined && data.lat !== null ? Number(data.lat) : null),
      lng: data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : (data.lng !== undefined && data.lng !== null ? Number(data.lng) : null),
      rule_score: data.severityScore !== undefined ? Number(data.severityScore) : (data.rule_score !== undefined ? Number(data.rule_score) : 0),
      rule_severity: ruleSeverity,
      rule_reasons: Array.isArray(data.severityReasons) ? data.severityReasons : (Array.isArray(data.rule_reasons) ? data.rule_reasons : []),
      final_severity: finalSeverity,
      severity_override: override,
      status: data.status || 'Reported',
      assigned_team_id: data.assignedTeamId || null,
      assigned_at: data.assignedAt || null,
      priority_score: data.priorityScore || 0,
      priority_label: data.priorityLabel || null,
      priority_breakdown: data.priorityBreakdown || [],
      status_history: Array.isArray(data.statusHistory) ? data.statusHistory : (Array.isArray(data.status_history) ? data.status_history : []),
      is_sample: data.isSample !== undefined ? !!data.isSample : (data.is_sample !== undefined ? !!data.is_sample : false),
      updated_at: data.updatedAt || now
    };

    if (data.id) row.id = data.id;
    if (data.citizenId) row.citizen_id = data.citizenId;
    if (data.citizen_id) row.citizen_id = data.citizen_id;
    if (data.createdAt) row.created_at = data.createdAt;
    if (data.created_at) row.created_at = data.created_at;
    if (data.isDraft !== undefined) row.is_draft = !!data.isDraft;
    if (data.needsHumanReview !== undefined) row.needs_human_review = !!data.needsHumanReview;
    if (data.aiStatus !== undefined) row.ai_status = data.aiStatus;
    if (data.aiSeverity !== undefined) row.ai_severity = data.aiSeverity;
    if (data.aiConfidence !== undefined) row.ai_confidence = data.aiConfidence;
    if (data.aiAnalysis !== undefined) row.ai_analysis = data.aiAnalysis;

    return row;
  }

  _mapFromHotspotRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      centerLat: Number(row.center_lat),
      centerLng: Number(row.center_lng),
      radiusM: Number(row.radius_m),
      incidentIds: Array.isArray(row.incident_ids) ? row.incident_ids : [],
      reportCount: Number(row.report_count),
      category: row.category,
      severity: row.severity,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _mapToHotspotRow(data) {
    const row = {
      center_lat: Number(data.centerLat),
      center_lng: Number(data.centerLng),
      radius_m: Number(data.radiusM || 1000),
      incident_ids: data.incidentIds || [],
      report_count: Number(data.reportCount || (data.incidentIds ? data.incidentIds.length : 0)),
      category: data.category || null,
      severity: data.severity || 'High',
      status: data.status || 'active',
      updated_at: new Date().toISOString()
    };
    if (data.id) row.id = data.id;
    if (data.createdAt) row.created_at = data.createdAt;
    return row;
  }

  async getAll({ search, category, severity, status, sort, includeDrafts = false } = {}) {
    if (!supabase) throw new Error('Supabase client is not configured');

    let query = supabase
      .from('incidents')
      .select('*, citizens(name, phone)');

    // Incomplete drafts never reach the authority queue
    if (!includeDrafts) {
      query = query.neq('status', 'Draft');
    }

    // 1. Filter by category
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    // 2. Filter by status
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    // 3. Filter by severity
    if (severity && severity !== 'All') {
      query = query.or(`severity_override.eq.${severity},and(severity_override.is.null,rule_severity.eq.${severity})`);
    }

    // 4. Search across title, description, address_text, id
    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`id.ilike.%${term}%,title.ilike.%${term}%,description.ilike.%${term}%,address_text.ilike.%${term}%`);
    }

    // 5. Default order: created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseRepository] getAll error:', error);
      throw error;
    }

    let items = (data || []).map(row => { const inc = this._mapFromRow(row); const p = calculatePriority(inc); return { ...inc, priorityScore: p.score, priorityLabel: p.label, priorityBreakdown: p.breakdown }; });

    // Custom sorting: Critical first or severity order
    const severityRank = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1
    };

    if (sort === 'severity') {
      items.sort((a, b) => {
        const rankA = severityRank[a.severityOverride || a.severity] || 0;
        const rankB = severityRank[b.severityOverride || b.severity] || 0;
        if (rankB !== rankA) {
          return rankB - rankA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // Default: prioritize Critical on top, then newest
      items.sort((a, b) => {
        const isCritA = (a.severityOverride || a.severity) === 'Critical' ? 1 : 0;
        const isCritB = (b.severityOverride || b.severity) === 'Critical' ? 1 : 0;
        if (isCritB !== isCritA) {
          return isCritB - isCritA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return items;
  }

  async getById(id) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!id) return null;

    const { data, error } = await supabase
      .from('incidents')
      .select('*, citizens(name, phone)')
      .ilike('id', id.trim())
      .maybeSingle();

    if (error) {
      console.error(`[SupabaseRepository] getById(${id}) error:`, error);
      throw error;
    }

    return this._mapFromRow(data);
  }

  async create(incidentData) {
    if (!supabase) throw new Error('Supabase client is not configured');

    const id = incidentData.id || this.generateId();
    const now = new Date().toISOString();

    // If citizen phone is provided and citizenId is not set, look up or create citizen
    let citizenId = incidentData.citizenId || null;
    const contactPhone = (incidentData.contactPhone || '').trim();
    const contactName = (incidentData.contactName || '').trim();

    if (!citizenId && contactPhone) {
      try {
        const { data: existingCitizen } = await supabase
          .from('citizens')
          .select('id')
          .eq('phone', contactPhone)
          .maybeSingle();

        if (existingCitizen) {
          citizenId = existingCitizen.id;
        } else if (contactName) {
          const { data: newCitizen } = await supabase
            .from('citizens')
            .insert({ name: contactName, phone: contactPhone })
            .select('id')
            .single();
          if (newCitizen) citizenId = newCitizen.id;
        }
      } catch (cErr) {
        console.warn('[SupabaseRepository] Citizen upsert non-critical warning:', cErr.message);
      }
    }

    const payload = this._mapToRow({
      ...incidentData,
      id,
      citizenId,
      statusHistory: incidentData.statusHistory || [
        { status: incidentData.status || 'Reported', at: now, note: 'Initial incident report logged' }
      ],
      createdAt: incidentData.createdAt || now,
      updatedAt: now
    });

    const { data, error } = await supabase
      .from('incidents')
      .insert(payload)
      .select('*, citizens(name, phone)')
      .single();

    if (error) {
      console.error('[SupabaseRepository] create error:', error);
      throw error;
    }

    return this._mapFromRow(data);
  }

  async update(id, partial) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!id) return null;

    const existing = await this.getById(id);
    if (!existing) return null;

    const updateFields = {
      updated_at: new Date().toISOString()
    };

    if (partial.status !== undefined) updateFields.status = partial.status;
    if (partial.assignedTeamId !== undefined) updateFields.assigned_team_id = partial.assignedTeamId;
    if (partial.assignedAt !== undefined) updateFields.assigned_at = partial.assignedAt;
    if (partial.priorityScore !== undefined) updateFields.priority_score = partial.priorityScore;
    if (partial.priorityLabel !== undefined) updateFields.priority_label = partial.priorityLabel;
    if (partial.priorityBreakdown !== undefined) updateFields.priority_breakdown = partial.priorityBreakdown;
    if (partial.statusHistory !== undefined) updateFields.status_history = partial.statusHistory;
    if (partial.severityOverride !== undefined) {
      updateFields.severity_override = partial.severityOverride || null;
      updateFields.final_severity = partial.severityOverride || existing.severity || 'Low';
    }
    if (partial.severityReasons !== undefined) updateFields.rule_reasons = partial.severityReasons;
    if (partial.finalSeverity !== undefined) updateFields.final_severity = partial.finalSeverity;
    if (partial.isDraft !== undefined) updateFields.is_draft = !!partial.isDraft;
    if (partial.needsHumanReview !== undefined) updateFields.needs_human_review = !!partial.needsHumanReview;
    if (partial.aiStatus !== undefined) updateFields.ai_status = partial.aiStatus;
    if (partial.aiSeverity !== undefined) updateFields.ai_severity = partial.aiSeverity;
    if (partial.aiConfidence !== undefined) updateFields.ai_confidence = partial.aiConfidence;
    if (partial.aiAnalysis !== undefined) updateFields.ai_analysis = partial.aiAnalysis;

    const { data, error } = await supabase
      .from('incidents')
      .update(updateFields)
      .ilike('id', id.trim())
      .select('*, citizens(name, phone)')
      .single();

    if (error) {
      console.error(`[SupabaseRepository] update(${id}) error:`, error);
      throw error;
    }

    return this._mapFromRow(data);
  }

  async delete(id) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!id) return false;

    const { error } = await supabase
      .from('incidents')
      .delete()
      .ilike('id', id.trim());

    if (error) {
      console.error(`[SupabaseRepository] delete(${id}) error:`, error);
      throw error;
    }

    return true;
  }

  async getStats() {
    if (!supabase) throw new Error('Supabase client is not configured');

    const { data, error } = await supabase
      .from('incidents')
      .select('category, rule_severity, severity_override, status');

    if (error) {
      console.error('[SupabaseRepository] getStats error:', error);
      throw error;
    }

    const items = data || [];
    const total = items.length;
    let critical = 0;
    let reported = 0;
    let assigned = 0;
    let inProgress = 0;
    let resolved = 0;

    const byCategory = {
      'Fire Emergency': 0,
      'Road Accident': 0,
      'Medical Emergency': 0,
      'Flood': 0,
      'Building Collapse': 0,
      'Other Emergencies': 0
    };

    const bySeverity = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    for (const inc of items) {
      const effSev = inc.severity_override || inc.rule_severity || 'Low';
      if (effSev === 'Critical') critical++;
      if (bySeverity[effSev] !== undefined) bySeverity[effSev]++;

      if (inc.status === 'Reported') reported++;
      else if (inc.status === 'Assigned') assigned++;
      else if (inc.status === 'In Progress') inProgress++;
      else if (inc.status === 'Resolved') resolved++;

      if (byCategory[inc.category] !== undefined) {
        byCategory[inc.category]++;
      } else {
        byCategory['Other Emergencies'] = (byCategory['Other Emergencies'] || 0) + 1;
      }
    }

    return {
      total,
      critical,
      reported,
      assigned,
      inProgress,
      resolved,
      byCategory,
      bySeverity
    };
  }

  async getByCitizenId(citizenId) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!citizenId) return [];

    const { data, error } = await supabase
      .from('incidents')
      .select('*, citizens(name, phone)')
      .eq('citizen_id', citizenId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseRepository] getByCitizenId error:', error);
      throw error;
    }

    return (data || []).map(row => this._mapFromRow(row));
  }

  async upsertCitizen({ name, phone }) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!phone) throw new Error('Phone number is required for citizen upsert');

    const cleanName = (name || '').trim();
    const cleanPhone = phone.trim();

    // Check if citizen already exists
    const { data: existing, error: findError } = await supabase
      .from('citizens')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (findError) {
      console.error('[SupabaseRepository] upsertCitizen find error:', findError);
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('citizens')
        .update({ name: cleanName })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('[SupabaseRepository] upsertCitizen update error:', updateError);
        return {
          id: existing.id,
          name: cleanName || existing.name,
          phone: existing.phone,
          createdAt: existing.created_at
        };
      }

      return {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        createdAt: updated.created_at
      };
    }

    const { data: created, error: insertError } = await supabase
      .from('citizens')
      .insert({ name: cleanName, phone: cleanPhone })
      .select()
      .single();

    if (insertError) {
      console.error('[SupabaseRepository] upsertCitizen insert error:', insertError);
      throw insertError;
    }

    return {
      id: created.id,
      name: created.name,
      phone: created.phone,
      createdAt: created.created_at
    };
  }

  async getIncidentsWithin({ lat, lng, radiusM, since }) {
    if (!supabase) throw new Error('Supabase client is not configured');

    try {
      const { data, error } = await supabase.rpc('incidents_within', {
        lat: Number(lat),
        lng: Number(lng),
        radius_m: Number(radiusM),
        since: since ? new Date(since).toISOString() : null
      });

      if (!error && Array.isArray(data)) {
        return data.map(r => this._mapFromRow(r));
      }
    } catch (err) {
      console.warn('[SupabaseRepository] incidents_within RPC unavailable, using fallback:', err.message);
    }

    // Haversine fallback if PostGIS RPC fails or is unavailable
    const all = await this.getAll();
    const centerLat = Number(lat);
    const centerLng = Number(lng);
    const rad = Number(radiusM);
    const sinceTime = since ? new Date(since).getTime() : -Infinity;

    const R = 6371000;
    return all.filter(inc => {
      if (inc.latitude === null || inc.latitude === undefined || inc.longitude === null || inc.longitude === undefined) {
        return false;
      }
      if (new Date(inc.createdAt).getTime() < sinceTime) {
        return false;
      }
      const dLat = ((Number(inc.latitude) - centerLat) * Math.PI) / 180;
      const dLon = ((Number(inc.longitude) - centerLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((centerLat * Math.PI) / 180) *
          Math.cos((Number(inc.latitude) * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c <= rad;
    });
  }

  async getAllHotspots() {
    if (!supabase) throw new Error('Supabase client is not configured');

    const { data, error } = await supabase
      .from('hotspot_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseRepository] getAllHotspots error:', error);
      throw error;
    }

    return (data || []).map(r => this._mapFromHotspotRow(r));
  }

  async getActiveHotspots() {
    if (!supabase) throw new Error('Supabase client is not configured');

    const { data, error } = await supabase
      .from('hotspot_alerts')
      .select('*')
      .in('status', ['active', 'acknowledged'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseRepository] getActiveHotspots error:', error);
      throw error;
    }

    return (data || []).map(r => this._mapFromHotspotRow(r));
  }

  async getHotspotById(id) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!id) return null;

    const { data, error } = await supabase
      .from('hotspot_alerts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[SupabaseRepository] getHotspotById(${id}) error:`, error);
      throw error;
    }

    return this._mapFromHotspotRow(data);
  }

  async createHotspot(hotspotData) {
    if (!supabase) throw new Error('Supabase client is not configured');

    const payload = this._mapToHotspotRow(hotspotData);
    const { data, error } = await supabase
      .from('hotspot_alerts')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseRepository] createHotspot error:', error);
      throw error;
    }

    return this._mapFromHotspotRow(data);
  }

  async updateHotspot(id, partial) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!id) return null;

    const updateFields = {
      updated_at: new Date().toISOString()
    };
    if (partial.status !== undefined) updateFields.status = partial.status;
    if (partial.severity !== undefined) updateFields.severity = partial.severity;
    if (partial.reportCount !== undefined) updateFields.report_count = Number(partial.reportCount);
    if (partial.incidentIds !== undefined) updateFields.incident_ids = partial.incidentIds;
    if (partial.category !== undefined) updateFields.category = partial.category;
    if (partial.centerLat !== undefined) updateFields.center_lat = Number(partial.centerLat);
    if (partial.centerLng !== undefined) updateFields.center_lng = Number(partial.centerLng);
    if (partial.radiusM !== undefined) updateFields.radius_m = Number(partial.radiusM);

    const { data, error } = await supabase
      .from('hotspot_alerts')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[SupabaseRepository] updateHotspot(${id}) error:`, error);
      throw error;
    }

    return this._mapFromHotspotRow(data);
  }

  async saveIncidentMedia({ incidentId, storagePath, mimeType, sizeBytes, durationSeconds = null }) {
    if (!supabase) throw new Error('Supabase client is not configured');

    const row = {
      incident_id: incidentId,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: Number(sizeBytes),
      duration_seconds: durationSeconds ? Number(durationSeconds) : null
    };

    const { data, error } = await supabase
      .from('incident_media')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseRepository] saveIncidentMedia error:', error);
      throw error;
    }

    return {
      id: data.id,
      incidentId: data.incident_id,
      storagePath: data.storage_path,
      mimeType: data.mime_type,
      sizeBytes: Number(data.size_bytes),
      durationSeconds: data.duration_seconds,
      createdAt: data.created_at
    };
  }

  async getMediaByIncidentId(incidentId) {
    if (!supabase) throw new Error('Supabase client is not configured');
    if (!incidentId) return null;

    const { data, error } = await supabase
      .from('incident_media')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error(`[SupabaseRepository] getMediaByIncidentId(${incidentId}) error:`, error);
      throw error;
    }

    if (!data) return null;
    return {
      id: data.id,
      incidentId: data.incident_id,
      storagePath: data.storage_path,
      mimeType: data.mime_type,
      sizeBytes: Number(data.size_bytes),
      durationSeconds: data.duration_seconds,
      createdAt: data.created_at
    };
  }

  async seed(incidentsList) {
    if (!supabase) throw new Error('Supabase client is not configured');

    const rows = incidentsList.map(item => this._mapToRow(item));

    // Clear existing sample incidents if re-seeding
    await supabase.from('incidents').delete().eq('is_sample', true);

    const { error } = await supabase
      .from('incidents')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[SupabaseRepository] seed error:', error);
      throw error;
    }

    return rows.length;
  }
}

module.exports = new SupabaseRepository();
