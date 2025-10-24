class BaseController {
    constructor(model) {
        this.model = model;
    }

    // Get all records with tenant isolation
    async getAll(req, res) {
        try {
            const where = req.tenantFilter || {};
            const records = await this.model.findAll({ where });
            res.json(records);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get one record with tenant isolation
    async getOne(req, res) {
        try {
            const where = {
                ...req.tenantFilter,
                [this.model.primaryKeyAttribute]: req.params.id
            };
            const record = await this.model.findOne({ where });
            
            if (!record) {
                return res.status(404).json({ error: 'Record not found' });
            }
            
            res.json(record);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Create record with tenant isolation
    async create(req, res) {
        try {
            const data = {
                ...req.body,
                tenant_id: req.user.role === 'global_admin' ? req.body.tenant_id : req.user.tenant_id
            };
            const record = await this.model.create(data);
            res.status(201).json(record);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update record with tenant isolation
    async update(req, res) {
        try {
            const where = {
                ...req.tenantFilter,
                [this.model.primaryKeyAttribute]: req.params.id
            };
            
            const [updated] = await this.model.update(req.body, { where });
            
            if (!updated) {
                return res.status(404).json({ error: 'Record not found' });
            }
            
            const record = await this.model.findOne({ where });
            res.json(record);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Delete record with tenant isolation
    async delete(req, res) {
        try {
            const where = {
                ...req.tenantFilter,
                [this.model.primaryKeyAttribute]: req.params.id
            };
            
            const deleted = await this.model.destroy({ where });
            
            if (!deleted) {
                return res.status(404).json({ error: 'Record not found' });
            }
            
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = BaseController; 