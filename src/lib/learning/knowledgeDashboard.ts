import { careerKnowledgeCatalog } from "./careers";
import { certificationCatalog } from "./certificationCatalog";
import { curriculumConceptLibrary } from "./concepts";
import { curriculumSubjects } from "./curriculum";
import {
  courseCurriculumLifecycleRecords,
  courseAuthorityMappings,
  curriculumAuthoritySources,
  lessonObjectiveAlignments,
} from "./curriculumAuthority";
import { generateCurriculumLearningPath } from "./learningPaths";
import { buildMasteryMap } from "./masteryMap";
import { resourceMapLinks } from "./resourceMapping";
import { buildSkillTree } from "./skills";
import { learningStandards } from "./standards";
import { globalSubjectCatalog } from "./subjects";
import type { KnowledgeIntelligenceDashboard } from "./types";

export function buildKnowledgeIntelligenceDashboard(): KnowledgeIntelligenceDashboard {
  return {
    subjects: globalSubjectCatalog,
    curriculum: curriculumSubjects,
    concepts: curriculumConceptLibrary,
    skillTree: buildSkillTree("cybersecurity"),
    standards: learningStandards,
    curriculumAuthority: curriculumAuthoritySources,
    courseAuthorityMappings,
    lessonObjectiveAlignments,
    courseCurriculumLifecycle: courseCurriculumLifecycleRecords,
    careers: careerKnowledgeCatalog,
    certifications: certificationCatalog,
    generatedPath: generateCurriculumLearningPath({
      goal: "Become a security analyst",
      careerId: "security-analyst",
      certificationId: "comptia-security-plus",
      subjectId: "cybersecurity",
      interest: "security operations",
    }),
    resourceLinks: resourceMapLinks,
    masteryMap: buildMasteryMap("cybersecurity"),
  };
}
