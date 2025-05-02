import { createPostgresClient } from '../config.js';
import generateSql from '../services/surveyService.js';

export const surveySqlController = async (req, res) => {
    const { db_name } = req.body;

    if (!db_name) {
        return res.status(400).send("Database name is required.");
    }

    try {
        const client = createPostgresClient(db_name);
        await client.connect();
        console.log(`Connected to PostgreSQL database: ${db_name}`);
        const payload = req.body;

        const { allQueries: queries, dbFetechedIds } = await generateSql(payload, client);

        const {
            surveyId,
            sectionIdStart,
            optionIdStart,
            questionIdStart,
            surveyReferenceIdStart,
            surveySectionIdStart,
            conditionIdStart,
            questionOptionIdStart,
            sectionQuestionIdStart,
            conditionalQuestionMappingIdStart,
            tagIdStart
        } = dbFetechedIds;

        const {
            ticket_number,
            survey_primary_id,
            section_primary_id,
            option_primary_id,
            question_primary_id,
            survey_reference_primary_id,
            survey_section_primary_id,
            conditional_question_mapping_primary_id,
            condition_primary_id,
            question_option_primary_id,
            section_question_primary_id,
            tag_primary_id,
            attributes
        } = payload;

        const rawResponse = `
            Ticket Number: ${ticket_number || ''}
            
            survey_primary_id: ${survey_primary_id ? survey_primary_id.join(', ') : surveyId}
            section_primary_id: ${section_primary_id ? section_primary_id.join(', ') : sectionIdStart}
            option_primary_id: ${option_primary_id ? option_primary_id.join(', ') : optionIdStart}
            question_primary_id: ${question_primary_id ? question_primary_id.join(', ') : questionIdStart}
            survey_reference_primary_id: ${survey_reference_primary_id ? survey_reference_primary_id.join(', ') : surveyReferenceIdStart}
            survey_section_primary_id: ${survey_section_primary_id ? survey_section_primary_id.join(', ') : surveySectionIdStart}
            conditional_question_mapping_primary_id: ${conditional_question_mapping_primary_id ? conditional_question_mapping_primary_id.join(', ') : conditionalQuestionMappingIdStart}
            condition_primary_id: ${condition_primary_id ? condition_primary_id.join(', ') : conditionIdStart}
            question_option_primary_id: ${question_option_primary_id ? question_option_primary_id.join(', ') : questionOptionIdStart}
            section_question_primary_id: ${section_question_primary_id ? section_question_primary_id.join(', ') : sectionQuestionIdStart}
            tag_primary_id: ${tag_primary_id ? tag_primary_id : tagIdStart}
            attributes: ${attributes ? attributes.map(attr => attr.id).join(', ') : ''}

            Generated SQL Queries:
            ${queries}
        `;

        res.type('text/plain');
        // await client.end();
        res.status(200).send(rawResponse);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

export default surveySqlController;
