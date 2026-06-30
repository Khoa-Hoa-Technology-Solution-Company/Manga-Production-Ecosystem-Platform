import { Request, Response } from 'express';
import { RubricTemplate } from '../models/RubricTemplate';

// Fallback criteria if no template is found/active in database
export const DEFAULT_CRITERIA = [
  { key: 'artStyle', label: 'Art Style' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'characterDesign', label: 'Character Design' },
  { key: 'pacing', label: 'Pacing & Layout' },
  { key: 'commercialPotential', label: 'Commercial Potential' }
];

/**
 * GET /api/rubric-templates/active
 * Retrieve the currently active rubric template.
 */
export async function getActiveTemplate(req: Request, res: Response): Promise<void> {
  try {
    let active = await RubricTemplate.findOne({ isActive: true });
    if (!active) {
      // If none active, see if any exists. If not, create a default one
      const count = await RubricTemplate.countDocuments();
      if (count === 0 && req.user) {
        active = await RubricTemplate.create({
          name: 'Default Rubric Template',
          criteria: DEFAULT_CRITERIA,
          isActive: true,
          createdBy: req.user._id
        });
      } else {
        // Just return a simulated one or the first one
        const first = await RubricTemplate.findOne().sort({ createdAt: -1 });
        if (first) {
          first.isActive = true;
          await first.save();
          active = first;
        } else {
          // Return default mock schema
          res.json({
            template: {
              name: 'Default Rubric Template',
              criteria: DEFAULT_CRITERIA,
              isActive: true
            }
          });
          return;
        }
      }
    }
    res.json({ template: active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/rubric-templates
 * Retrieve all rubric templates.
 */
export async function getTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = await RubricTemplate.find().populate('createdBy', 'displayName avatar role').sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/rubric-templates
 * Create a new rubric template.
 */
export async function createTemplate(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'editorial_board' && req.user?.role !== 'editor') {
      res.status(403).json({ error: 'Only Editorial Board or Editors can manage rubric templates.' });
      return;
    }

    const { name, criteria } = req.body;
    if (!name || !criteria || !Array.isArray(criteria) || criteria.length === 0) {
      res.status(400).json({ error: 'Name and at least one criterion are required.' });
      return;
    }

    // Validate criteria shape
    for (const c of criteria) {
      if (!c.key || !c.label) {
        res.status(400).json({ error: 'Each criterion must have a key and a label.' });
        return;
      }
    }

    const template = await RubricTemplate.create({
      name,
      criteria,
      isActive: false, // created inactive by default
      createdBy: req.user._id
    });

    res.status(201).json({ template, message: 'Rubric template created successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/rubric-templates/:id/activate
 * Set a template as the active one (deactivates others).
 */
export async function setActiveTemplate(req: Request, res: Response): Promise<void> {
  try {
    if (req.user?.role !== 'editorial_board' && req.user?.role !== 'editor') {
      res.status(403).json({ error: 'Only Editorial Board or Editors can manage rubric templates.' });
      return;
    }

    const { id } = req.params;
    const template = await RubricTemplate.findById(id);
    if (!template) {
      res.status(404).json({ error: 'Rubric template not found.' });
      return;
    }

    // Deactivate all others
    await RubricTemplate.updateMany({ _id: { $ne: id } }, { isActive: false });

    // Activate this one
    template.isActive = true;
    await template.save();

    res.json({ template, message: `Rubric template "${template.name}" activated.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
