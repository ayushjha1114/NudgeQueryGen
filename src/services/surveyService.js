import { getNextId, fetchExistdata } from '../utils/helper.js';

async function generateSql(payload, client) {
    try {
        const {
            survey,
            section,
            options,
            questions,
            survey_reference_id,
            question_conditions,
            survey_primary_id,
            section_primary_id,
            option_primary_id,
            question_primary_id,
            survey_reference_primary_id,
            survey_section_primary_id,
            condition_primary_id,
            question_option_primary_id,
            section_question_primary_id,
            conditional_question_mapping_primary_id,
            tag_primary_id,
            attributes
        } = payload;

        const surveyId = survey_primary_id && survey_primary_id[0] ? survey_primary_id[0] : await getNextId(client, 'surveys');
        const sectionIdStart = section_primary_id && section_primary_id[0] ? section_primary_id[0] : await getNextId(client, 'sections');
        const optionIdStart = option_primary_id && option_primary_id[0] ? option_primary_id[0] : await getNextId(client, 'options');
        const questionIdStart = question_primary_id && question_primary_id[0] ? question_primary_id[0] : await getNextId(client, 'questions');
        const surveyReferenceIdStart = survey_reference_primary_id
            && survey_reference_primary_id[0]
            ? survey_reference_primary_id[0] : await getNextId(client, 'survey_reference');
        const surveySectionIdStart = survey_section_primary_id && survey_section_primary_id[0] ? survey_section_primary_id[0] : await getNextId(client, 'survey_section');
        const conditionIdStart = condition_primary_id && condition_primary_id[0] ? condition_primary_id[0] : await getNextId(client, 'conditions');
        // const languageReferenceIdStart = payload.language_reference_primary_id || await getNextId(client, 'language_reference');
        const questionOptionIdStart = question_option_primary_id && question_option_primary_id[0] ? question_option_primary_id[0] : await getNextId(client, 'question_options');
        const sectionQuestionIdStart = section_question_primary_id && section_question_primary_id[0] ? section_question_primary_id[0] : await getNextId(client, 'section_question');
        const conditionalQuestionMappingIdStart = conditional_question_mapping_primary_id && conditional_question_mapping_primary_id[0] ? conditional_question_mapping_primary_id[0] : await getNextId(client, 'conditional_question_mapping');
        const tagIdStart = tag_primary_id || await getNextId(client, 'tags');

        const dbFetechedIds = {
            surveyId, sectionIdStart, optionIdStart,
            questionIdStart, surveyReferenceIdStart,
            surveySectionIdStart, conditionIdStart,
            questionOptionIdStart, sectionQuestionIdStart,
            conditionalQuestionMappingIdStart,
            tagIdStart
        };

        // for Surveys
        const surveyQueries = survey.map((surveyName, index) => {
            const surveyIdCurrent = surveyId + index;
            return `
                INSERT INTO surveys (id, name, created_by, created_date, modified_by, modified_date, status)
                VALUES (${surveyIdCurrent}, '${surveyName}', 1, now(), 1, now(), 1);
            `;
        });
        // for Sections
        const sectionArray = [];
        const sectionQueries = section.map((sectionObj, index) => {
            const sectionIdCurrent = sectionIdStart + index;
            sectionArray.push({ sectionIdCurrent, section_seq: sectionObj.section_seq });
            return `
                INSERT INTO sections (id, name, image_url, created_by, created_date, modified_by, modified_date, status)
                VALUES (${sectionIdCurrent}, '${sectionObj.name}', '', 1, now(), 1, now(), 1);
            `;
        });

        // for Options
        const optionArray = [];
        const optionQueries = options.map((option, index) => {
            const optionIdCurrent = optionIdStart + index;
            optionArray.push({ optionIdCurrent, ...option });
            return `
                INSERT INTO options (id, name, type, image_url, created_by, created_date, modified_by, modified_date, status)
                VALUES (${optionIdCurrent}, '${option.name}', '${option.type}', '', 1, now(), 1, now(), 1);
            `;
        });

        // for Questions
        const questionsArray = [];
        const questionQueries = questions.map((question, index) => {
            const questionIdCurrent = questionIdStart + index;
            questionsArray.push({ id: questionIdCurrent, ...question });
            return `
                INSERT INTO questions (id, name, image_url, type, created_by, created_date, modified_by, modified_date, status)
                VALUES (${questionIdCurrent}, '${question.name}', '', '${question.type}', 1, now(), 1, now(), 1);
            `;
        });

        // for Survey References
        let currentSurveyRefId = surveyReferenceIdStart;
        let surveyReferenceIdList = [];
        const surveyReferenceQueries = survey.map((_, index) => {
            const surveyIdCurrent = surveyId + index;
            const result = survey_reference_id.map((surveyReferenceId) => {
                const query = `
                INSERT INTO survey_reference (id, survey_id, reference_id, reference_type, doer, reviewer, subject, start_date, end_date, publish, created_by, created_date, modified_by, modified_date, status, validation_config_id)
                VALUES (${currentSurveyRefId}, ${surveyIdCurrent}, ${surveyReferenceId}, 'STATE', 'UPCM', 'BPC', 'Didi', now(), now(), true, 1, now(), 1, now(), 1, null);
            `;
                surveyReferenceIdList.push(currentSurveyRefId);
                currentSurveyRefId++;
                return query;
            })
            return result;
        });

        // for Survey Sections
        const surveySectionQueries = surveyReferenceIdList.map((surveyRefId, surveyRefIndex) => {
            return sectionArray.map((sectionObj, sectionIndex) => {
                const surveySectionIdCurrent = surveySectionIdStart + (surveyRefIndex * sectionArray.length) + sectionIndex;
                const sectionId = sectionObj.sectionIdCurrent;
                return `
                    INSERT INTO survey_section (id, survey_reference_id, section_id, order_no, created_by, created_date, modified_by, modified_date, status)
                    VALUES (${surveySectionIdCurrent}, ${surveyRefId}, ${sectionId}, 1, 1, now(), 1, now(), 1);
                `;
            });
        }).flat();

        // for Section Questions
        let sectionQuestionQueries = [];
        let sectionQuestionId = sectionQuestionIdStart;
        let sectionQuestionPrimaryArray = [];
        questionsArray.forEach((question, index) => {
            sectionArray.forEach((section) => {
                if (section.section_seq === question.section_ref && question_conditions.filter(ele => ele.name === question.name).length === 0) {
                    const sectionId = section.sectionIdCurrent;
                    sectionQuestionPrimaryArray.push(sectionQuestionId);
                    sectionQuestionQueries.push(`
                        INSERT INTO section_question(
                            id, section_id, question_id, order_number, conditional, mandatory, created_by, created_date, modified_by, modified_date, status)
                        VALUES (${sectionQuestionId}, ${sectionId}, ${question.id}, 1, false, true, 1, now(), 1, now(), 1);
                    `);
                    sectionQuestionId++;
                }
            });
        });

        // for Section Questions with conditions
        if (question_conditions && question_conditions.length > 0) {
            question_conditions.forEach((condition, conditionIndex) => {
                let questionDetail = questionsArray.filter((question) => question.name === condition.name)
                if (questionDetail.length > 0) {
                    const matchingSection = sectionArray.find(section => section.section_seq === questionDetail[0]?.section_ref);
                    const sectionIdForCondition = matchingSection ? matchingSection.sectionIdCurrent : null;
                    sectionQuestionPrimaryArray.push(sectionQuestionId);
                    sectionQuestionQueries.push(`
                            INSERT INTO section_question(
                            id, section_id, question_id, order_number, conditional, mandatory, created_by, created_date, modified_by, modified_date, status)
                            VALUES (${sectionQuestionId}, ${sectionIdForCondition}, ${questionDetail[0]?.id}, 1, true, true, 1, now(), 1, now(), 1);
                        `);
                    sectionQuestionId++;
                }
            });
        }

        // for Question Options
        let questionOptionsQueries = [];
        let questionOptionId = questionOptionIdStart;
        questionsArray.forEach((question, index) => {
            optionArray.forEach((option, optionIndex) => {
                if (question.option_ref.includes(option.option_seq)) {
                    questionOptionsQueries.push(`
                    INSERT INTO question_options(
                        id, question_id, option_id, order_no, score, conditional, created_by, created_date, modified_by, modified_date, status)
                    VALUES (${questionOptionId}, ${question.id}, ${option.optionIdCurrent}, ${optionIndex + 1}, 1, false, 1, now(), 1, now(), 1);
                `);
                    questionOptionId++;
                }
            });
        });

        // for Conditional Question Mapping and Conditions (only if condition exists)
        let conditionalQueries = [];
        if (question_conditions && question_conditions.length > 0) {
            try {
                question_conditions.forEach((condition, index) => {
                    const conditionalQuestionMappingId = conditionalQuestionMappingIdStart + index;
                    const conditionId = conditionIdStart + index;
                    const target_question_id = questionsArray.filter((question) => question.name === condition.name)[0]?.id;
                    const source_question_id = questionsArray.filter((question) => question.name === condition.sourceQuestionName)[0]?.id;
                    const conditionValue = optionArray.filter((option) => option.name === "Yes")[0]?.optionIdCurrent || 936;
                    conditionalQueries.push(`
                        INSERT INTO conditional_question_mapping (id, source_question, target_question, conditionaloperator, created_by, created_date, modified_by, modified_date, status)
                        VALUES (${conditionalQuestionMappingId}, ${source_question_id}, ${target_question_id}, null, 1, now(), 1, now(), 1);
                    `);
                    conditionalQueries.push(`
                        INSERT INTO public.conditions (id, conditional_question_mapping_id, condition, created_by, created_date, modified_by, modified_date, status)
                        VALUES (${conditionId}, ${conditionalQuestionMappingId}, '@? = ${conditionValue}', 1 , now(), 1, now(), 1);
                    `);
                });
            } catch (error) {
                console.warn("🚀 ~question_conditions ~ error:", error)
            }
        }


        // for Language References
        const languageReferenceQueries = [
            ...survey.map((surveyName, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES 
                    ('en', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1),
                    ('bn_tr', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1),
                    ('ky', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1),
                    ('as', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1),
                    ('be', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1),
                    ('hi', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1),
                    ('bn_wb', '${surveyName}', '', ${surveyId + index}, 'SURVEY', 1, now(), 1, now(), 1);
                `;
            }),
            ...section.map((sectionObj, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES 
                    ('en', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1),
                    ('bn_tr', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1),
                    ('ky', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1),
                    ('as', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1),
                    ('be', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1),
                    ('hi', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1),
                    ('bn_wb', '${sectionObj.name}', '', ${sectionIdStart + index}, 'SECTION', 1, now(), 1, now(), 1);
                `;
            }),
            ...questions.map((question, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES 
                    ('en', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1),
                    ('bn_tr', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1),
                    ('ky', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1),
                    ('as', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1),
                    ('be', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1),
                    ('hi', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1),
                    ('bn_wb', '${question.name}', '', ${questionIdStart + index}, 'QUESTION', 1, now(), 1, now(), 1);
                `;
            }),
            ...options.map((option, index) => {
                return `
                    INSERT INTO language_reference (language_code, description, paraphrase, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                    VALUES 
                    ('en', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1),
                    ('bn_tr', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1),
                    ('ky', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1),
                    ('as', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1),
                    ('be', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1),
                    ('hi', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1),
                    ('bn_wb', '${option.name}', '', ${optionIdStart + index}, 'OPTION', 1, now(), 1, now(), 1);
                `;
            })
        ];


        // build tag hierarchy queries
        const buildTagHierarchyQueries = async ({ tag, tagArr, tagIdCurrentRef, tagIdMap, fetchExistdata, client }) => {
            // Skip if tag already handled (either existing or generated)
            if (tagIdMap.has(tag.name)) return;

            let parentId = 'NULL';

            if (tag.parentId) {
                // First, check if parent exists in DB
                let parentDbId = await fetchExistdata(client, { table: 'tags', name: tag.parentId.name });

                // If not in DB, recurse to build its hierarchy
                if (!parentDbId) {
                    await buildTagHierarchyQueries({
                        tag: tag.parentId,
                        tagArr,
                        tagIdCurrentRef,
                        tagIdMap,
                        fetchExistdata,
                        client
                    });
                    parentId = tagIdMap.get(tag.parentId.name);
                } else {
                    tagIdMap.set(tag.parentId.name, parentDbId);
                    parentId = parentDbId;
                }
            }

            // Create new tagId if not from DB
            let newTagId = await fetchExistdata(client, { table: 'tags', name: tag.name });
            if (!newTagId) {
                newTagId = tagIdCurrentRef.value++;
                tagArr.push(`
            INSERT INTO tags (id, name, parent_id, status, created_by, created_date, modified_by, modified_date)
            VALUES (${newTagId}, '${tag.name}', ${parentId}, 1, 1, now(), 1, now());
        `);
            }

            tagIdMap.set(tag.name, newTagId);
        };

        // for tags
        const tagsArray = [];
        const flatTagQueries = [];
        const tagIdMap = new Map();
        let tagIdCurrentRef = { value: tagIdStart };

        for (const question of questions) {
            if (!question?.tag?.name) continue;

            const tag = question.tag;

            // Check if tag already exists in DB
            let isTagExistId = await fetchExistdata(client, { table: 'tags', name: tag.name });

            if (!isTagExistId) {
                const resultTagArr = [];

                await buildTagHierarchyQueries({
                    tag,
                    tagArr: resultTagArr,
                    tagIdCurrentRef,
                    tagIdMap,
                    fetchExistdata,
                    client
                });

                flatTagQueries.push(...resultTagArr);
                tagsArray.push({ id: tagIdMap.get(tag.name), ...tag });
            } else {
                tagIdMap.set(tag.name, isTagExistId);
                tagsArray.push({ id: isTagExistId, ...tag });
            }
        }



        // for tag-reference mapping
        const tagReferenceQueries = [];
        sectionQuestionPrimaryArray.forEach((sectionQuestionId, index) => {
            if (tagsArray[index]) {
                const tag = tagsArray[index];
                // console.warn("🚀 ~ sectionQuestionPrimaryArray.forEach ~ tag:", tag)
                tagReferenceQueries.push(`
                INSERT INTO tag_reference (tag_id, reference_id, reference_type, created_by, created_date, modified_by, modified_date, status)
                VALUES (${tag.id}, ${sectionQuestionId}, 'SECTION_QUESTION', 1, now(), 1, now(), 1);
            `);
            }
        });

        // for attribute
        const attributeQueries = attributes && attributes.length > 0 ? attributes.map((attribute, index) => {
            return `
            INSERT INTO attributes (id, name, attribute_type, status, created_by, created_date, modified_by, modified_date, parent_id, periodicity)
            VALUES (${attribute.id}, '${attribute.name}', '${attribute.type}', 1, 1, now(), 1, now(), null, 0);
            `;
        }) : '';


        // for tag attribute mapping
        const tagAttributeMappingQueries = [];
        tagsArray.forEach((tag) => {
            const attribute = attributes && attributes.length > 0 ? attributes.find(attr => attr.tag === tag.name) : '';
            if (attribute) {
                tagAttributeMappingQueries.push(`
                INSERT INTO tag_attribute_mapping (tag_id, attribute_id, status, created_by, created_date, modified_by, modified_date)
                VALUES (${tag.id}, ${attribute.id}, 1, 1, now(), 1, now());
            `);
            }
        });


        // for attributeGroup

        // for attribute_group_mapping if any
        const attributeGroupMappingQueries = attributes && attributes.length > 0 ? attributes.map((attribute) => {
            if (attribute.attributeGroupId) {
                return `
                INSERT INTO attribute_group_mapping (attribute_group_id, attribute_id, status, created_by, created_date, modified_by, modified_date, name, group_id)
                VALUES (${attribute.attributeGroupId}, ${attribute.id}, 1, 1, now(), 1, now(), null, null);
                `;
            }
        }) : '';


        const allQueries = [
            ...surveyQueries,
            ...sectionQueries,
            ...optionQueries,
            ...questionQueries,
            ...surveyReferenceQueries,
            ...surveySectionQueries,
            ...sectionQuestionQueries,
            ...questionOptionsQueries,
            ...conditionalQueries,
            ...languageReferenceQueries,
            ...flatTagQueries,
            ...tagReferenceQueries,
            ...attributeQueries,
            ...tagAttributeMappingQueries,
            ...attributeGroupMappingQueries
        ].join("\n");

        return { allQueries, dbFetechedIds };
    } catch (err) {
        throw new Error(`Error in SQL queries: ${err.message}`);
    }
}

export default generateSql;