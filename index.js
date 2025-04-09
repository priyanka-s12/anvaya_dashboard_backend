require('dotenv').config();
const { initializeDatabase } = require('./db/db.connect');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3000;

const Lead = require('./models/lead.model');
const SalesAgent = require('./models/salesAgent.model');
const Comment = require('./models/comment.model');
const Tag = require('./models/tag.model');

const app = express();

const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

initializeDatabase();
app.listen(PORT, () => console.log(`Server is listening on port ${PORT} `));

app.get('/', (req, res) => res.send('Hello, Express'));

//salesAgent
const validateEmail = (email) => {
  const atIndex = email.indexOf('@');
  const dotIndex = email.indexOf('.');

  return atIndex > 0 && dotIndex > atIndex;
};

app.post('/api/agents', async (req, res) => {
  const { name, email, createdAt } = req.body;
  try {
    // console.log(validateEmail(email));
    const isEmailExists = await SalesAgent.findOne({ email });
    // console.log(isEmailExists);

    if (!validateEmail(email)) {
      res.status(400).json({
        error: "Invalid input: 'email' must be a valid email address.",
      });
    } else if (isEmailExists) {
      res.status(409).json({
        error: `Sales agent with email ${email} already exists.`,
      });
    } else {
      const agent = new SalesAgent({ name, email, createdAt });
      const saveAgent = await agent.save();
      res.status(201).json(saveAgent);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    const allAgents = await SalesAgent.find();
    res.status(200).json(allAgents);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

//leads
app.post('/api/leads', async (req, res) => {
  const { name, source, salesAgent, status, tags, timeToClose, priority } =
    req.body;
  try {
    const existingAgent = await SalesAgent.findOne({ _id: salesAgent });
    console.log(existingAgent, !name);

    if (!name) {
      res.status(200).json({ error: "Invalid input: 'name' is required." });
    } else if (!existingAgent) {
      res.status(404).json({
        error: `Sales agent with ID ${salesAgent} not found.`,
      });
    } else {
      const lead = new Lead({
        name,
        source,
        salesAgent,
        status,
        tags,
        timeToClose,
        priority,
      });
      const saveLead = await lead.save();
      res.status(201).json(saveLead);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leads', async (req, res) => {
  const { salesAgent, status, tags, source } = req.query;
  try {
    console.log(salesAgent, status, tags, source);

    const statusValues = [
      'New',
      'Contacted',
      'Qualified',
      'Proposal Sent',
      'Closed',
    ];
    const sourcesValues = [
      'Website',
      'Referral',
      'Cold Call',
      'Advertisement',
      'Email',
      'Other',
    ];

    // const tagsValue = ['High Value', 'Follow-up'];

    if (salesAgent && !mongoose.Types.ObjectId.isValid(salesAgent)) {
      res.status(400).json({
        error: `Invalid salesAgent ID: ${salesAgent}. Please provide a valid ObjectId.`,
      });
    }

    if (status && !statusValues.includes(status)) {
      res.status(400).json({
        error: `Invalid status input: 'status' must be one of: [${statusValues.join(
          ', '
        )}]`,
      });
    }

    if (source && !sourcesValues.includes(source)) {
      res.status(400).json({
        error: `Invalid source input: 'source' must be one of: [${sourcesValues.join(
          ', '
        )}]`,
      });
    }

    // if (tags) {
    //   const values = tagsValue.some((i) => tags.includes(i));

    //   console.log(values);
    //   if (!values) {
    //     res
    //       .status(400)
    //       .json({ error: `Tags can be any of ${tagsValue.join(', ')}` });
    //   }
    // }

    const filter = {};
    if (salesAgent) {
      filter.salesAgent = salesAgent;
    }

    if (status) {
      filter.status = status;
    }

    if (tags) {
      filter.tags = tags;
    }

    if (source) {
      filter.source = source;
    }

    const allLeads = await Lead.find(filter).populate('salesAgent');
    res.status(200).json(allLeads);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  const leadId = req.params.id;
  const dataToUpdate = req.body;
  try {
    if (leadId && !mongoose.Types.ObjectId.isValid(leadId)) {
      res.status(400).json({
        error: `Lead ID: ${leadId} must be valid.`,
      });
    }

    //when status is closed, update closedAt
    if (dataToUpdate.status === 'Closed') {
      dataToUpdate.closedAt = new Date();
      dataToUpdate.timeToClose = 0;
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { ...dataToUpdate, updatedAt: new Date() },
      {
        new: true,
      }
    );

    if (!updatedLead) {
      res.status(404).json({ error: `Lead with ID ${leadId} not found.` });
    }
    res.status(200).json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  const leadId = req.params.id;
  try {
    const deleteLead = await Lead.findByIdAndDelete(leadId);

    if (!deleteLead) {
      res.status(404).json({ error: `Lead with ID ${leadId} not found.` });
    }

    res.status(200).json({
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

//tags
app.post('/api/tags', async (req, res) => {
  const { name } = req.body;
  try {
    const newTag = new Tag({ name });
    await newTag.save();
    res.status(201).json(newTag);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const allTags = await Tag.find();
    res.status(200).json(allTags);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

//comments
app.post('/api/leads/:id/comments', async (req, res) => {
  const lead = req.params.id;
  const { author, commentText } = req.body;
  console.log(lead, author, commentText);
  try {
    const leadId = await Lead.findOne({ _id: lead });
    console.log('lead id find: ', leadId);

    if (leadId) {
      const newComment = new Comment({ lead, author, commentText });
      await newComment.save();
      res.status(201).json(newComment);
    } else {
      res.status(404).json({ error: `Lead with ID ${lead} not found.` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leads/:id/comments', async (req, res) => {
  try {
    const lead = req.params.id;
    const allComments = await Comment.find({ lead }).populate('author');
    res.status(200).json(allComments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

//reporting
app.get('/report/leads-by-status', async (req, res) => {
  try {
    const allLeads = await Lead.find();

    const leadsByStatus = allLeads.reduce((acc, curr) => {
      const status = curr.status;
      // acc[status] = acc[status] ? acc[status] + 1 : 1;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    console.log(leadsByStatus);
    res.status(200).json(leadsByStatus);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/report/pipeline', async (req, res) => {
  try {
    const allLeads = await Lead.find();

    const leadsInPipeline = allLeads.reduce(
      (acc, curr) => {
        const status = curr.status;
        if (status === 'Closed') {
          acc.closed = acc.closed + 1;
        } else {
          acc.pipeline = acc.pipeline + 1;
        }
        return acc;
      },
      { pipeline: 0, closed: 0 }
    );
    console.log(leadsInPipeline);
    res.status(200).json(leadsInPipeline);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/report/closed-by-agent', async (req, res) => {
  try {
    const allLeads = await Lead.find().populate('salesAgent');
    // console.log(allLeads);

    const leadsByAgent = allLeads.reduce((acc, curr) => {
      const agent = curr.salesAgent.name;
      console.log(agent, curr.status);

      if (!acc[agent]) {
        acc[agent] = 0;
      }
      if (curr.status === 'Closed') {
        acc[agent] = acc[agent] + 1;
      }

      return acc;
    }, {});
    console.log(leadsByAgent);
    res.status(200).json(leadsByAgent);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/report/last-week', async (req, res) => {
  try {
    const closedLeads = await Lead.find({ status: 'Closed' });
    console.log(closedLeads);

    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    console.log(sevenDaysAgoDate);

    const lastWeekClosedLeads = closedLeads.filter(
      (lead) => lead.updatedAt >= sevenDaysAgoDate
    );
    console.log(lastWeekClosedLeads);

    res.status(200).json(lastWeekClosedLeads);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
