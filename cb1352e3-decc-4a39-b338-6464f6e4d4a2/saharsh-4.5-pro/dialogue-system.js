/**
 * Dialogue System - Story and Conversation Management
 * 
 * Purpose: Manages all story dialogue, character conversations, branching choices, and narrative progression
 * Dependencies: This file requires game-engine.js, character-system.js, enemies-rivals.js to be loaded first
 * Exports: window.DialogueSystem - Complete dialogue and narrative management system
 */

class DialogueSystem {
    constructor(engine) {
        this.engine = engine;
        this.currentDialogue = null;
        this.dialogueHistory = [];
        this.storyFlags = {};
        this.characterRelationships = {};
        this.activeConversations = new Map();
        this.dialogueQueue = [];
        this.isTyping = false;
        this.typingSpeed = 50; // ms per character
        this.autoAdvance = false;
        this.textSpeed = 'normal'; // slow, normal, fast
        
        // Story progression tracking
        this.chapterProgress = 0;
        this.completedQuests = [];
        this.currentQuest = null;
        this.questFlags = {};
        
        // Initialize dialogue trees and story content
        this.initializeDialogueTrees();
        this.initializeStoryFlags();
        
        // Setup UI references
        this.setupDialogueUI();
    }

    /**
     * Setup dialogue UI event listeners
     */
    setupDialogueUI() {
        // Text advance on click/spacebar
        document.addEventListener('keydown', (e) => {
            if (this.currentDialogue && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                this.advanceDialogue();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (this.currentDialogue && !e.target.closest('.dialogue-choice')) {
                this.advanceDialogue();
            }
        });
    }

    /**
     * Initialize comprehensive dialogue trees for all characters
     */
    initializeDialogueTrees() {
        this.dialogueTrees = {
            // Opening story dialogue
            'story_opening': {
                start: {
                    text: "Welcome to your worst nightmare... I mean, school year. Eric M., you've been failing Ms. Johnson's class and now the school itself has turned against you.",
                    speaker: 'Narrator',
                    next: 'introduction'
                },
                introduction: {
                    text: "Stress has become monsters, homework has become deadly obstacles, and the teacher... well, let's just say she's very motivated to see you in detention.",
                    speaker: 'Narrator',
                    next: 'game_explanation'
                },
                game_explanation: {
                    text: "Survive 10 weeks, defeat rivals, avoid the teacher, and pass the final exam. Your choices will determine your fate.",
                    speaker: 'Narrator',
                    next: 'controls'
                },
                controls: {
                    text: "Move with WASD, press M for map, I for inventory, and ESC to pause. Good luck, Eric.",
                    speaker: 'Narrator',
                    next: null,
                    endDialogue: true
                }
            },
            
            // Eric's internal monologue
            'eric_monologue': {
                daily_start: {
                    text: "Another day, another chance to fail spectacularly...",
                    speaker: 'Eric M.',
                    next: 'motivation_check'
                },
                motivation_check: {
                    text: "I need to pass this class. I can't let my parents down again.",
                    speaker: 'Eric M.',
                    next: 'reality_check'
                },
                reality_check: {
                    text: "But first, I need to survive whatever nightmare version of school this is.",
                    speaker: 'Eric M.',
                    next: null,
                    endDialogue: true
                },
                
                stressed: {
                    text: "I can't take this much longer... the pressure is crushing me.",
                    speaker: 'Eric M.',
                    next: 'stress_management'
                },
                stress_management: {
                    text: "Maybe I should find somewhere safe to calm down... like the library.",
                    speaker: 'Eric M.',
                    next: null,
                    endDialogue: true
                },
                
                confident: {
                    text: "Actually, I think I'm starting to get the hang of this. Maybe I can actually succeed!",
                    speaker: 'Eric M.',
                    next: 'confidence_boost'
                },
                confidence_boost: {
                    text: "Stay focused, Eric. One day at a time.",
                    speaker: 'Eric M.',
                    next: null,
                    endDialogue: true
                }
            },
            
            // Anbu dialogue tree
            'anbu': {
                first_meeting: {
                    text: "Eric M., isn't it? I hope you're prepared for today's material. I wouldn't want you to fall further behind.",
                    speaker: 'Anbu',
                    next: 'player_response_1',
                    emotion: 'condescending'
                },
                player_response_1: {
                    choices: [
                        {
                            text: "I'm trying my best, Anbu.",
                            response: 'sympathetic',
                            relationship_change: +2
                        },
                        {
                            text: "At least I don't make everyone else feel stupid.",
                            response: 'defensive',
                            relationship_change: -5
                        },
                        {
                            text: "Maybe you could help me understand?",
                            response: 'humble',
                            relationship_change: +5
                        }
                    ]
                },
                
                // Sympathetic path
                sympathetic: {
                    text: "I suppose everyone struggles sometimes. But hard work beats natural talent when natural talent doesn't work hard.",
                    speaker: 'Anbu',
                    next: 'work_ethic'
                },
                work_ethic: {
                    text: "If you truly want to improve, meet me in the library after school. I can share some study techniques.",
                    speaker: 'Anbu',
                    next: null,
                    endDialogue: true,
                    unlockQuest: 'study_session_anbu'
                },
                
                // Defensive path
                defensive: {
                    text: "Sensitivity won't help you pass your exams. Maybe channel that energy into actually studying?",
                    speaker: 'Anbu',
                    next: 'defensive_end'
                },
                defensive_end: {
                    text: "I'll be watching your progress, Eric. Don't disappoint me.",
                    speaker: 'Anbu',
                    next: null,
                    endDialogue: true
                },
                
                // Humble path
                humble: {
                    text: "Interesting... You actually want to learn. Most people just want to get by.",
                    speaker: 'Anbu',
                    next: 'humble_response'
                },
                humble_response: {
                    text: "Very well. Meet me in the library tomorrow. I have some materials that might help.",
                    speaker: 'Anbu',
                    next: null,
                    endDialogue: true,
                    unlockQuest: 'study_session_anbu'
                },
                
                // Repeat encounters
                study_partner: {
                    text: "Ready for our study session? I hope you've been practicing what I taught you.",
                    speaker: 'Anbu',
                    next: 'study_session_choice',
                    emotion: 'expectant'
                },
                study_session_choice: {
                    choices: [
                        {
                            text: "I've been practicing hard!",
                            response: 'enthusiastic',
                            knowledge_bonus: 10
                        },
                        {
                            text: "I've been trying...",
                            response: 'honest',
                            knowledge_bonus: 5
                        },
                        {
                            text: "I forgot to study...",
                            response: 'guilty',
                            stress_penalty: 5
                        }
                    ]
                },
                
                competitive: {
                    text: "I heard you've been making progress. Don't get too confident - I still have higher grades.",
                    speaker: 'Anbu',
                    next: 'competitive_response',
                    emotion: 'challenging'
                },
                competitive_response: {
                    choices: [
                        {
                            text: "We'll see who's at the top when grades come out.",
                            response: 'competitive',
                            relationship_change: -3
                        },
                        {
                            text: "I'm not trying to compete with you, Anbu.",
                            response: 'peaceful',
                            relationship_change: +3
                        }
                    ]
                }
            },
            
            // Saharsh dialogue tree
            'saharsh': {
                first_meeting: {
                    text: "Hey! You must be the guy everyone's talking about. Eric, right? I'm Saharsh. What's your story?",
                    speaker: 'Saharsh',
                    next: 'saharsh_intro_response',
                    emotion: 'friendly'
                },
                saharsh_intro_response: {
                    choices: [
                        {
                            text: "Just trying to survive school like everyone else.",
                            response: 'relatable',
                            relationship_change: +3
                        },
                        {
                            text: "I'm failing and this place is trying to kill me.",
                            response: 'dramatic',
                            relationship_change: +2
                        },
                        {
                            text: "None of your business.",
                            response: 'hostile',
                            relationship_change: -4
                        }
                    ]
                },
                
                // Relatable path
                relatable: {
                    text: "Ha! Relatable answer. You know what? I like you. School's rough for everyone.",
                    speaker: 'Saharsh',
                    next: 'relatable_continue'
                },
                relatable_continue: {
                    text: "Tell you what - if you ever need to blow off steam or want to hang with the cool kids, find me in the cafeteria.",
                    speaker: 'Saharsh',
                    next: null,
                    endDialogue: true,
                    unlockArea: 'social_circle'
                },
                
                // Dramatic path
                dramatic: {
                    text: "Whoa, drama queen much? But hey, I respect the honesty. This place is pretty crazy.",
                    speaker: 'Saharsh',
                    next: 'dramatic_continue'
                },
                dramatic_continue: {
                    text: "You seem like you'd fit in with my crowd. We know how to make the best of bad situations.",
                    speaker: 'Saharsh',
                    next: null,
                    endDialogue: true,
                    unlockArea: 'social_circle'
                },
                
                // Hostile path
                hostile: {
                    text: "Ooh, touchy! Don't worry, I like mysterious types. You'll come around.",
                    speaker: 'Saharsh',
                    next: 'hostile_continue'
                },
                hostile_continue: {
                    text: "The offer stands if you change your mind. I know everyone worth knowing.",
                    speaker: 'Saharsh',
                    next: null,
                    endDialogue: true
                },
                
                // Social encounters
                cafeteria_meet: {
                    text: "Eric! Perfect timing. Want to sit with me and my friends?",
                    speaker: 'Saharsh',
                    next: 'social_choice',
                    emotion: 'welcoming'
                },
                social_choice: {
                    choices: [
                        {
                            text: "I'd love to!",
                            response: 'accept_social',
                            charisma_bonus: 8,
                            stress_relief: 10
                        },
                        {
                            text: "I should probably study instead.",
                            response: 'responsible',
                            knowledge_bonus: 5,
                            relationship_change: -2
                        },
                        {
                            text: "Maybe some other time.",
                            response: 'polite_decline',
                            relationship_change: +1
                        }
                    ]
                },
                
                // Help requests
                need_favor: {
                    text: "Hey Eric, I need a favor. Mind helping me with something?",
                    speaker: 'Saharsh',
                    next: 'favor_request',
                    emotion: 'hopeful'
                },
                favor_request: {
                    choices: [
                        {
                            text: "What do you need?",
                            response: 'helpful',
                            relationship_change: +8,
                            unlockQuest: 'saharsh_favor'
                        },
                        {
                            text: "Depends on what it is.",
                            response: 'cautious',
                            relationship_change: +2
                        },
                        {
                            text: "I'm busy right now.",
                            response: 'busy',
                            relationship_change: -3
                        }
                    ]
                }
            },
            
            // Calvin dialogue tree
            'calvin': {
                first_meeting: {
                    text: "Well, well, well... if it isn't Eric M., the walking disaster magnet. What's it like being the teacher's favorite detention customer?",
                    speaker: 'Calvin',
                    next: 'calvin_response',
                    emotion: 'mischievous'
                },
                calvin_response: {
                    choices: [
                        {
                            text: "Very funny. What's your deal?",
                            response: 'curious',
                            relationship_change: +1
                        },
                        {
                            text: "At least I'm not a total screw-up like you.",
                            response: 'insulting',
                            relationship_change: -6
                        },
                        {
                            text: "Just trying to make it through the day.",
                            response: 'honest',
                            relationship_change: +3
                        }
                    ]
                },
                
                // Curious path
                curious: {
                    text: "My deal? I'm the guy who makes this place interesting. Unlike goody-two-shoes over there.",
                    speaker: 'Calvin',
                    next: 'calvin_philosophy'
                },
                calvin_philosophy: {
                    text: "You know what they say - if you can't beat the system, break it. Want to see how it's done?",
                    speaker: 'Calvin',
                    next: null,
                    endDialogue: true,
                    unlockQuest: 'calvin_chaos'
                },
                
                // Insulting path
                insulting: {
                    text: "Ooh, feisty! I like that. Most people just cower when I mess with them.",
                    speaker: 'Calvin',
                    next: 'insulting_continue'
                },
                insulting_continue: {
                    text: "Keep that attitude and maybe we can be friends. Or enemies. Either way, it'll be fun.",
                    speaker: 'Calvin',
                    next: null,
                    endDialogue: true
                },
                
                // Honest path
                honest: {
                    text: "Hey, at least you're real about it. That's more than I can say for most people here.",
                    speaker: 'Calvin',
                    next: 'honest_continue'
                },
                honest_continue: {
                    text: "If you ever want to learn how to work the system instead of letting it work you, find me.",
                    speaker: 'Calvin',
                    next: null,
                    endDialogue: true,
                    unlockQuest: 'calvin_chaos'
                },
                
                // Chaos encounters
                rule_break: {
                    text: "Psst... Eric. Want to see something fun? Follow me.",
                    speaker: 'Calvin',
                    next: 'rule_break_choice',
                    emotion: 'exciting'
                },
                rule_break_choice: {
                    choices: [
                        {
                            text: "What are you planning?",
                            response: 'curious_chaos',
                            relationship_change: +5
                        },
                        {
                            text: "No way, I'm not getting detention.",
                            response: 'responsible_chaos',
                            relationship_change: -4
                        },
                        {
                            text: "Count me in!",
                            response: 'chaos_ally',
                            relationship_change: +10,
                            stress_increase: 15
                        }
                    ]
                },
                
                detention_solidarity: {
                    text: "Well, well... looks like we're both in the same boat. detention buddies!",
                    speaker: 'Calvin',
                    next: 'detention_chat',
                    emotion: 'commiserating'
                },
                detention_chat: {
                    text: "At least detention gives us time to talk. So, what's your story?",
                    speaker: 'Calvin',
                    next: 'detention_response',
                    emotion: 'supportive'
                },
                detention_response: {
                    choices: [
                        {
                            text: "I'm just trying to pass.",
                            response: 'simple_goal',
                            relationship_change: +3
                        },
                        {
                            text: "I'm fighting against this whole system.",
                            response: 'rebellious',
                            relationship_change: +7
                        },
                        {
                            text: "I don't really know anymore.",
                            response: 'confused',
                            relationship_change: +5
                        }
                    ]
                }
            },
            
            // Teacher encounters
            'teacher': {
                first_sighting: {
                    text: "Eric M.! Where do you think you're going? You're supposed to be in class!",
                    speaker: 'Ms. Johnson',
                    next: 'teacher_chase_start',
                    emotion: 'authoritative'
                },
                teacher_chase_start: {
                    text: "Don't make me chase you! You know what happens when I catch you!",
                    speaker: 'Ms. Johnson',
                    next: null,
                    endDialogue: true,
                    triggerEvent: 'teacher_pursuit'
                },
                
                classroom_capture: {
                    text: "Eric M.! Detention! Now! You've missed too many assignments!",
                    speaker: 'Ms. Johnson',
                    next: 'detention_sentence',
                    emotion: 'furious'
                },
                detention_sentence: {
                    text: "That's it! You're coming with me. No arguments!",
                    speaker: 'Ms. Johnson',
                    next: null,
                    endDialogue: true,
                    triggerEvent: 'detention'
                },
                
                warning: {
                    text: "Eric, we need to talk. Your performance has been... concerning.",
                    speaker: 'Ms. Johnson',
                    next: 'warning_response',
                    emotion: 'disappointed'
                },
                warning_response: {
                    choices: [
                        {
                            text: "I know I need to do better.",
                            response: 'apologetic',
                            relationship_change: +2
                        },
                        {
                            text: "I'm trying my best!",
                            response: 'defensive',
                            relationship_change: -3
                        },
                        {
                            text: "What can I do to improve?",
                            response: 'receptive',
                            relationship_change: +5
                        }
                    ]
                },
                
                final_confrontation: {
                    text: "Eric M., this is it. Final exam time. Show me everything you've learned.",
                    speaker: 'Ms. Johnson',
                    next: 'final_exam_intro',
                    emotion: 'serious'
                },
                final_exam_intro: {
                    text: "This will determine whether you pass or fail. No pressure... except for your entire academic future.",
                    speaker: 'Ms. Johnson',
                    next: null,
                    endDialogue: true,
                    triggerEvent: 'final_exam'
                }
            },
            
            // Library NPCs
            'librarian': {
                greeting: {
                    text: "Welcome to the library, dear. It's nice to see a student seeking knowledge.",
                    speaker: 'Librarian',
                    next: 'library_services',
                    emotion: 'kind'
                },
                library_services: {
                    text: "We have study guides, reference materials, and a quiet place to focus. What brings you here today?",
                    speaker: 'Librarian',
                    next: 'library_choice',
                    emotion: 'helpful'
                },
                library_choice: {
                    choices: [
                        {
                            text: "I need to study for exams.",
                            response: 'study_request',
                            knowledge_bonus: 15,
                            stress_relief: 20
                        },
                        {
                            text: "Just looking for a quiet place.",
                            response: 'quiet_request',
                            stress_relief: 25
                        },
                        {
                            text: "Do you have any study tips?",
                            response: 'tips_request',
                            intelligence_bonus: 5
                        }
                    ]
                },
                
                study_request: {
                    text: "Wonderful! Knowledge is the best weapon against academic anxiety. Take your time.",
                    speaker: 'Librarian',
                    next: null,
                    endDialogue: true,
                    heal: 20
                },
                
                quiet_request: {
                    text: "Of course, dear. Sometimes we all need a moment of peace in this chaotic place.",
                    speaker: 'Librarian',
                    next: null,
                    endDialogue: true,
                    stress_reduction: 30
                },
                
                tips_request: {
                    text: "Always break complex problems into smaller parts, and don't be afraid to ask for help. That's what I'm here for.",
                    speaker: 'Librarian',
                    next: null,
                    endDialogue: true
                }
            },
            
            // Cafeteria encounters
            'lunch_monitor': {
                lunch_line: {
                    text: "Order up! What'll it be today? Try the mystery meat - it's... an experience.",
                    speaker: 'Lunch Monitor',
                    next: 'food_choice',
                    emotion: 'cheerful'
                },
                food_choice: {
                    choices: [
                        {
                            text: "I'll take the mystery meat.",
                            response: 'adventurous',
                            health_effect: 15,
                            stress_increase: 10,
                            risk: 0.3
                        },
                        {
                            text: "Just a regular slice of pizza.",
                            response: 'safe_choice',
                            health_effect: 10
                        },
                        {
                            text: "I'm not hungry right now.",
                            response: 'no_food',
                            relationship_change: -1
                        }
                    ]
                },
                
                adventurous: {
                    text: "Bold choice! Either you'll love it or... well, you'll learn something about your digestive system.",
                    speaker: 'Lunch Monitor',
                    next: null,
                    endDialogue: true
                },
                
                safe_choice: {
                    text: "Good choice! Reliable and safe. Sometimes that's exactly what you need.",
                    speaker: 'Lunch Monitor',
                    next: null,
                    endDialogue: true
                },
                
                no_food: {
                    text: "Suit yourself, but you'll need your strength for whatever chaos this place throws at you next.",
                    speaker: 'Lunch Monitor',
                    next: null,
                    endDialogue: true
                }
            },
            
            // Random encounter dialogues
            'random_encounters': {
                motivation_boost: {
                    text: "You can do this, Eric! Everyone has potential - you just need to believe in yourself!",
                    speaker: 'Mysterious Voice',
                    next: null,
                    endDialogue: true,
                    confidence_boost: 10
                },
                
                warning: {
                    text: "Be careful, Eric. The teacher has been asking about you. She's... not happy.",
                    speaker: 'Concerned Student',
                    next: null,
                    endDialogue: true,
                    warning_flag: true
                },
                
                encouragement: {
                    text: "I've seen you in action - you're stronger than you think. Keep fighting!",
                    speaker: 'Anonymous Cheer',
                    next: null,
                    endDialogue: true,
                    motivation: 15
                },
                
                reality_check: {
                    text: "This place is insane, but so are you. That might actually be an advantage.",
                    speaker: 'Fellow Student',
                    next: null,
                    endDialogue: true,
                    resilience_boost: 5
                }
            },
            
            // Quest-related dialogues
            'quests': {
                study_session_anbu: {
                    text: "Alright Eric, let's see what you've learned. *opens textbook*",
                    speaker: 'Anbu',
                    next: 'study_quiz',
                    emotion: 'focused'
                },
                study_quiz: {
                    choices: [
                        {
                            text: "I'm ready!",
                            response: 'confident_quiz',
                            knowledge_check: 'medium'
                        },
                        {
                            text: "Maybe we should start with basics...",
                            response: 'humble_quiz',
                            knowledge_check: 'easy'
                        },
                        {
                            text: "I'm a bit nervous...",
                            response: 'nervous_quiz',
                            stress_increase: 5
                        }
                    ]
                },
                
                saharsh_favor: {
                    text: "So here's the deal - I need you to distract Ms. Johnson for about 5 minutes. Can you do that?",
                    speaker: 'Saharsh',
                    next: 'favor_details',
                    emotion: 'pleading'
                },
                favor_details: {
                    choices: [
                        {
                            text: "How am I supposed to do that?",
                            response: 'practical',
                            unlockQuest: 'distraction_mission'
                        },
                        {
                            text: "That sounds risky...",
                            response: 'cautious_favor',
                            relationship_change: -2
                        },
                        {
                            text: "Sure, what do I need to do?",
                            response: 'eager_favor',
                            relationship_change: +3
                        }
                    ]
                },
                
                calvin_chaos: {
                    text: "Ready to shake things up? I know where they keep the good snacks... and I mean the REALLY good ones.",
                    speaker: 'Calvin',
                    next: 'chaos_mission',
                    emotion: 'mischievous'
                },
                chaos_mission: {
                    choices: [
                        {
                            text: "This sounds like a bad idea.",
                            response: 'responsible_chaos',
                            relationship_change: -1
                        },
                        {
                            text: "Let's do it!",
                            response: 'chaos_ally',
                            relationship_change: +8,
                            stress_increase: 20
                        },
                        {
                            text: "What's the plan?",
                            response: 'strategic_chaos',
                            relationship_change: +5
                        }
                    ]
                }
            }
        };
    }

    /**
     * Initialize story flags for tracking narrative progress
     */
    initializeStoryFlags() {
        this.storyFlags = {
            // Opening sequence
            opening_completed: false,
            tutorial_finished: false,
            
            // Character introductions
            met_anbu: false,
            met_saharsh: false,
            met_calvin: false,
            met_teacher: false,
            
            // Relationship milestones
            anbu_alliance: false,
            saharsh_alliance: false,
            calvin_alliance: false,
            teacher_hostility: 0,
            
            // Story progression
            week_1_complete: false,
            week_2_complete: false,
            week_5_complete: false,
            week_10_complete: false,
            
            // Quest completion
            study_session_complete: false,
            distraction_mission_complete: false,
            chaos_mission_complete: false,
            
            // Special events
            teacher_pursuit_active: false,
            detention_visited: false,
            library_frequent_visitor: false,
            cafeteria_chaos_survivor: false,
            
            // Academic progress
            knowledge_threshold_50: false,
            knowledge_threshold_100: false,
            knowledge_threshold_200: false,
            
            // Endings
            ending_good: false,
            ending_average: false,
            ending_bad: false,
            ending_secret: false
        };
    }

    /**
     * Alias for startDialogue - for compatibility
     */
    start(character, text = null, choices = [], options = {}) {
        return this.startDialogue(character, text, choices, options);
    }

    /**
     * Start dialogue with a character or story event
     */
    startDialogue(character, text = null, choices = [], options = {}) {
        // If text is provided, use it directly
        if (text) {
            this.currentDialogue = {
                character: character,
                text: text,
                choices: choices,
                ...options
            };
        } else {
            // Otherwise, try to find dialogue tree
            const dialogueKey = this.getDialogueKey(character);
            const node = this.dialogueTrees[dialogueKey];
            
            if (!node || !node.start) {
                console.warn(`No dialogue found for character: ${character}`);
                return false;
            }
            
            this.currentDialogue = {
                character: character,
                currentNode: 'start',
                ...node.start
            };
        }
        
        // Set dialogue state
        this.isTyping = true;
        this.dialogueHistory.push({
            character: this.currentDialogue.character,
            text: this.currentDialogue.text,
            timestamp: Date.now(),
            type: 'dialogue'
        });
        
        // Update UI
        this.updateDialogueDisplay();
        
        // Start typewriter effect
        this.startTypewriterEffect();
        
        console.log(`Started dialogue with ${character}`);
        return true;
    }

    /**
     * Get dialogue key for character
     */
    getDialogueKey(character) {
        const characterMap = {
            'Anbu': 'anbu',
            'Saharsh': 'saharsh',
            'Calvin': 'calvin',
            'Ms. Johnson': 'teacher',
            'Teacher': 'teacher',
            'Narrator': 'story_opening',
            'Eric M.': 'eric_monologue',
            'Librarian': 'librarian',
            'Lunch Monitor': 'lunch_monitor'
        };
        
        return characterMap[character.toLowerCase()] || character.toLowerCase().replace(/\s+/g, '_');
    }

    /**
     * Start typewriter effect for text display
     */
    startTypewriterEffect() {
        if (!this.currentDialogue || !this.currentDialogue.text) return;
        
        const text = this.currentDialogue.text;
        const textElement = this.engine.ui.dialogueText;
        const nameElement = this.engine.ui.dialogueName;
        
        if (textElement) {
            textElement.textContent = '';
            this.isTyping = true;
            
            let index = 0;
            const speed = this.getTypingSpeed();
            
            const typeInterval = setInterval(() => {
                if (index < text.length) {
                    textElement.textContent += text.charAt(index);
                    index++;
                } else {
                    clearInterval(typeInterval);
                    this.isTyping = false;
                    this.showDialogueChoices();
                }
            }, speed);
        }
        
        // Update character name
        if (nameElement) {
            nameElement.textContent = this.currentDialogue.character;
        }
    }

    /**
     * Get typing speed based on settings
     */
    getTypingSpeed() {
        const speeds = {
            'slow': 80,
            'normal': 50,
            'fast': 20
        };
        
        return speeds[this.textSpeed] || speeds['normal'];
    }

    /**
     * Advance dialogue to next part
     */
    advanceDialogue() {
        if (this.isTyping) {
            // Skip typing effect
            this.completeTypingEffect();
            return;
        }
        
        if (!this.currentDialogue) return;
        
        // Handle choices
        if (this.currentDialogue.choices && this.currentDialogue.choices.length > 0) {
            return; // Wait for player to make choice
        }
        
        // Move to next dialogue part
        if (this.currentDialogue.next) {
            this.moveToNextDialogueNode(this.currentDialogue.next);
        } else if (this.currentDialogue.endDialogue) {
            this.endDialogue();
        }
    }

    /**
     * Move to next dialogue node
     */
    moveToNextDialogueNode(nodeKey) {
        if (!this.currentDialogue) return;
        
        const dialogueKey = this.getDialogueKey(this.currentDialogue.character);
        const node = this.dialogueTrees[dialogueKey];
        
        if (node && node[nodeKey]) {
            this.currentDialogue = {
                ...this.currentDialogue,
                currentNode: nodeKey,
                ...node[nodeKey]
            };
            
            this.dialogueHistory.push({
                character: this.currentDialogue.character,
                text: this.currentDialogue.text,
                timestamp: Date.now(),
                type: 'dialogue'
            });
            
            this.updateDialogueDisplay();
            this.startTypewriterEffect();
        } else {
            this.endDialogue();
        }
    }

    /**
     * Complete typing effect immediately
     */
    completeTypingEffect() {
        this.isTyping = false;
        if (this.engine.ui.dialogueText && this.currentDialogue) {
            this.engine.ui.dialogueText.textContent = this.currentDialogue.text;
        }
        this.showDialogueChoices();
    }

    /**
     * Show dialogue choice buttons
     */
    showDialogueChoices() {
        const choicesContainer = this.engine.ui.dialogueChoices;
        if (!choicesContainer) return;
        
        choicesContainer.innerHTML = '';
        
        if (this.currentDialogue && this.currentDialogue.choices) {
            this.currentDialogue.choices.forEach((choice, index) => {
                const choiceButton = document.createElement('button');
                choiceButton.className = 'dialogue-choice';
                choiceButton.textContent = choice.text;
                choiceButton.addEventListener('click', () => this.selectChoice(index));
                choicesContainer.appendChild(choiceButton);
            });
        }
    }

    /**
     * Handle choice selection
     */
    selectChoice(choiceIndex) {
        if (!this.currentDialogue || !this.currentDialogue.choices) return;
        
        const choice = this.currentDialogue.choices[choiceIndex];
        if (!choice) return;
        
        // Apply choice effects
        this.applyChoiceEffects(choice);
        
        // Move to response node
        if (choice.response) {
            this.moveToNextDialogueNode(choice.response);
        } else if (choice.next) {
            this.moveToNextDialogueNode(choice.next);
        } else {
            this.endDialogue();
        }
    }

    /**
     * Apply effects of dialogue choice
     */
    applyChoiceEffects(choice) {
        const player = this.engine.character.data;
        
        // Relationship changes
        if (choice.relationship_change) {
            this.updateCharacterRelationship(this.currentDialogue.character, choice.relationship_change);
        }
        
        // Stat bonuses/penalties
        if (choice.knowledge_bonus) {
            player.knowledge += choice.knowledge_bonus;
        }
        if (choice.charisma_bonus) {
            player.stats.charisma += choice.charisma_bonus;
        }
        if (choice.intelligence_bonus) {
            player.stats.intelligence += choice.intelligence_bonus;
        }
        if (choice.stress_increase) {
            player.stress += choice.stress_increase;
        }
        if (choice.stress_relief) {
            player.stress = Math.max(0, player.stress - choice.stress_relief);
        }
        if (choice.stress_reduction) {
            player.stress = Math.max(0, player.stress - choice.stress_reduction);
        }
        if (choice.heal) {
            player.health = Math.min(player.maxHealth, player.health + choice.heal);
        }
        if (choice.health_effect) {
            player.health = Math.min(player.maxHealth, player.health + choice.health_effect);
        }
        if (choice.confidence_boost) {
            this.applyStatusEffect('confidence', choice.confidence_boost);
        }
        if (choice.motivation) {
            this.applyStatusEffect('motivation', choice.motivation);
        }
        if (choice.resilience_boost) {
            this.applyStatusEffect('resilience', choice.resilience_boost);
        }
        
        // Quest unlocking
        if (choice.unlockQuest) {
            this.unlockQuest(choice.unlockQuest);
        }
        
        // Area unlocking
        if (choice.unlockArea) {
            this.unlockArea(choice.unlockArea);
        }
        
        // Knowledge checks
        if (choice.knowledge_check) {
            this.handleKnowledgeCheck(choice.knowledge_check);
        }
        
        // Risk effects
        if (choice.risk && Math.random() < choice.risk) {
            player.health -= 15;
            this.addRandomDialogue("The mystery meat doesn't agree with you... -15 health!");
        }
        
        // Update UI
        this.engine.updateUI();
    }

    /**
     * Update character relationship
     */
    updateCharacterRelationship(character, change) {
        if (!this.characterRelationships[character]) {
            this.characterRelationships[character] = 0;
        }
        
        this.characterRelationships[character] += change;
        
        // Update in enemies system if it's a rival
        if (this.engine.enemiesAndRivals) {
            const rivalId = this.getDialogueKey(character);
            if (rivalId && this.engine.enemiesAndRivals.rivalCharacters[rivalId]) {
                this.engine.enemiesAndRivals.updateRivalRelationship(rivalId, 'diplomatic_choice', change);
            }
        }
    }

    /**
     * Apply status effect to player
     */
    applyStatusEffect(type, intensity) {
        const player = this.engine.character.data;
        player.statusEffects = player.statusEffects || [];
        
        player.statusEffects.push({
            type: type,
            duration: 300, // 5 minutes
            intensity: intensity,
            description: `${type} boost`
        });
    }

    /**
     * Handle knowledge check for dialogue
     */
    handleKnowledgeCheck(difficulty) {
        const player = this.engine.character.data;
        const requiredKnowledge = {
            'easy': 30,
            'medium': 60,
            'hard': 90
        };
        
        const required = requiredKnowledge[difficulty] || 30;
        
        if (player.knowledge >= required) {
            this.addRandomDialogue("You answer confidently! The knowledge serves you well.");
            player.knowledge += 10; // Bonus for success
        } else {
            this.addRandomDialogue("You struggle with the question... maybe you need more study time.");
            player.stress += 5; // Penalty for failure
        }
    }

    /**
     * Unlock quest
     */
    unlockQuest(questId) {
        if (!this.completedQuests.includes(questId)) {
            this.completedQuests.push(questId);
            console.log(`Quest unlocked: ${questId}`);
        }
    }

    /**
     * Unlock area
     */
    unlockArea(areaId) {
        if (this.engine.school) {
            this.engine.school.unlockArea(areaId);
        }
    }

    /**
     * Update dialogue display in UI
     */
    updateDialogueDisplay() {
        if (!this.currentDialogue) return;
        
        // Update character name
        if (this.engine.ui.dialogueName) {
            this.engine.ui.dialogueName.textContent = this.currentDialogue.character;
        }
        
        // Update character portrait (simplified)
        if (this.engine.ui.dialoguePortrait) {
            this.engine.ui.dialoguePortrait.textContent = this.getCharacterIcon(this.currentDialogue.character);
        }
        
        // Clear previous choices
        if (this.engine.ui.dialogueChoices) {
            this.engine.ui.dialogueChoices.innerHTML = '';
        }
    }

    /**
     * Get character icon for dialogue
     */
    getCharacterIcon(character) {
        const icons = {
            'Eric M.': '🧑‍🎓',
            'Anbu': '🎓',
            'Saharsh': '😎',
            'Calvin': '😈',
            'Ms. Johnson': '👩‍🏫',
            'Teacher': '👩‍🏫',
            'Narrator': '📖',
            'Librarian': '📚',
            'Lunch Monitor': '👨‍🍳'
        };
        
        return icons[character] || '👤';
    }

    /**
     * Add random dialogue message
     */
    addRandomDialogue(message) {
        this.dialogueHistory.push({
            character: 'System',
            text: message,
            timestamp: Date.now(),
            type: 'system'
        });
        
        // Show in dialogue box
        if (this.engine.ui.dialogueText) {
            this.engine.ui.dialogueText.textContent = message;
        }
    }

    /**
     * End current dialogue
     */
    endDialogue() {
        this.currentDialogue = null;
        this.isTyping = false;
        
        // Hide dialogue UI
        if (this.engine.ui.dialogueContainer) {
            this.engine.ui.dialogueContainer.classList.remove('dialogue-visible');
        }
        
        // Return to game state
        if (this.engine.state === 'dialogue') {
            this.engine.state = 'playing';
        }
        
        console.log('Dialogue ended');
    }

    /**
     * Trigger special dialogue events
     */
    triggerEvent(eventType, data = {}) {
        switch (eventType) {
            case 'teacher_pursuit':
                this.startDialogue('Narrator', 'The teacher has spotted you! Time to run!', [], { triggerAction: 'start_pursuit' });
                break;
                
            case 'detention':
                this.startDialogue('Narrator', 'Detention awaits... time to reflect on your choices.', [], { triggerAction: 'go_detention' });
                break;
                
            case 'final_exam':
                this.startDialogue('Ms. Johnson', 'This is it, Eric. Show me what you\'ve learned.', [], { triggerAction: 'final_exam' });
                break;
                
            case 'study_session':
                this.startDialogue('Anbu', 'Ready to study together?', [], { triggerAction: 'study_session' });
                break;
                
            case 'social_circle':
                this.startDialogue('Saharsh', 'Welcome to the cool kids table!', [], { triggerAction: 'social_boost' });
                break;
                
            case 'chaos_mission':
                this.startDialogue('Calvin', 'Time to cause some controlled chaos!', [], { triggerAction: 'chaos_mission' });
                break;
        }
    }

    /**
     * Check story conditions and trigger appropriate dialogue
     */
    checkStoryConditions() {
        const player = this.engine.character.data;
        const week = this.engine.gameData.week;
        
        // Week-based story events
        if (week === 1 && !this.storyFlags.week_1_complete) {
            this.checkWeek1Events();
        } else if (week === 2 && !this.storyFlags.week_2_complete) {
            this.checkWeek2Events();
        } else if (week === 5 && !this.storyFlags.week_5_complete) {
            this.checkWeek5Events();
        } else if (week === 10 && !this.storyFlags.week_10_complete) {
            this.checkWeek10Events();
        }
        
        // Knowledge-based events
        if (player.knowledge >= 50 && !this.storyFlags.knowledge_threshold_50) {
            this.triggerKnowledgeEvent(50);
        }
        
        if (player.knowledge >= 100 && !this.storyFlags.knowledge_threshold_100) {
            this.triggerKnowledgeEvent(100);
        }
        
        if (player.knowledge >= 200 && !this.storyFlags.knowledge_threshold_200) {
            this.triggerKnowledgeEvent(200);
        }
    }

    /**
     * Check week 1 story events
     */
    checkWeek1Events() {
        if (this.storyFlags.met_anbu && this.storyFlags.met_saharsh) {
            this.startDialogue('Narrator', 'Week 1 complete! You\'ve met your rivals and survived your first encounters.', [], { endWeek: true });
            this.storyFlags.week_1_complete = true;
        }
    }

    /**
     * Check week 2 story events
     */
    checkWeek2Events() {
        if (this.characterRelationships['Anbu'] > 20) {
            this.startDialogue('Anbu', 'You\'ve been making good progress, Eric. I think we could work together.', [], { unlockAlliance: 'anbu' });
            this.storyFlags.week_2_complete = true;
        }
    }

    /**
     * Check week 5 story events
     */
    checkWeek5Events() {
        this.startDialogue('Narrator', 'Midterm week! The pressure is really building now. Can you handle it?', [], { endWeek: true });
        this.storyFlags.week_5_complete = true;
    }

    /**
     * Check week 10 story events
     */
    checkWeek10Events() {
        this.startDialogue('Ms. Johnson', 'Final exam week, Eric. This is everything you\'ve worked for.', [], { finalExam: true });
        this.storyFlags.week_10_complete = true;
    }

    /**
     * Trigger knowledge milestone events
     */
    triggerKnowledgeEvent(threshold) {
        const messages = {
            50: 'You\'re starting to get the hang of this! Knowledge is power.',
            100: 'Impressive progress! You\'re becoming quite the scholar.',
            200: 'Incredible! You\'ve mastered more than most students learn in a year.'
        };
        
        this.startDialogue('Narrator', messages[threshold], [], { knowledgeMilestone: threshold });
        
        switch (threshold) {
            case 50:
                this.storyFlags.knowledge_threshold_50 = true;
                break;
            case 100:
                this.storyFlags.knowledge_threshold_100 = true;
                break;
            case 200:
                this.storyFlags.knowledge_threshold_200 = true;
                break;
        }
    }

    /**
     * Update dialogue system
     */
    update(deltaTime) {
        // Check for story conditions
        this.checkStoryConditions();
        
        // Handle queued dialogues
        if (this.dialogueQueue.length > 0 && !this.currentDialogue) {
            const nextDialogue = this.dialogueQueue.shift();
            this.startDialogue(nextDialogue.character, nextDialogue.text, nextDialogue.choices, nextDialogue.options);
        }
        
        // Auto-advance dialogue if enabled
        if (this.autoAdvance && !this.isTyping && !this.currentDialogue?.choices?.length) {
            setTimeout(() => this.advanceDialogue(), 2000);
        }
    }

    /**
     * Queue dialogue for later
     */
    queueDialogue(character, text, choices = [], options = {}) {
        this.dialogueQueue.push({ character, text, choices, options });
    }

    /**
     * Get story flag status
     */
    getStoryFlag(flag) {
        return this.storyFlags[flag] || false;
    }

    /**
     * Set story flag
     */
    setStoryFlag(flag, value = true) {
        this.storyFlags[flag] = value;
    }

    /**
     * Get dialogue history
     */
    getDialogueHistory() {
        return [...this.dialogueHistory];
    }

    /**
     * Clear dialogue history
     */
    clearDialogueHistory() {
        this.dialogueHistory = [];
    }

    /**
     * Get current quest status
     */
    getCurrentQuest() {
        return this.currentQuest;
    }

    /**
     * Set current quest
     */
    setCurrentQuest(quest) {
        this.currentQuest = quest;
    }

    /**
     * Get completed quests
     */
    getCompletedQuests() {
        return [...this.completedQuests];
    }

    /**
     * Save dialogue system data
     */
    save() {
        const storageKey = location.pathname + "dialogue_data";
        try {
            const dialogueData = {
                storyFlags: this.storyFlags,
                characterRelationships: this.characterRelationships,
                dialogueHistory: this.dialogueHistory,
                chapterProgress: this.chapterProgress,
                completedQuests: this.completedQuests,
                currentQuest: this.currentQuest,
                questFlags: this.questFlags,
                textSpeed: this.textSpeed,
                autoAdvance: this.autoAdvance
            };
            localStorage.setItem(storageKey, JSON.stringify(dialogueData));
        } catch (error) {
            console.error('Failed to save dialogue data:', error);
        }
    }

    /**
     * Load dialogue system data
     */
    load() {
        const storageKey = location.pathname + "dialogue_data";
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.storyFlags = { ...this.storyFlags, ...data.storyFlags };
                this.characterRelationships = data.characterRelationships || {};
                this.dialogueHistory = data.dialogueHistory || [];
                this.chapterProgress = data.chapterProgress || 0;
                this.completedQuests = data.completedQuests || [];
                this.currentQuest = data.currentQuest;
                this.questFlags = data.questFlags || {};
                this.textSpeed = data.textSpeed || 'normal';
                this.autoAdvance = data.autoAdvance || false;
                return true;
            }
        } catch (error) {
            console.error('Failed to load dialogue data:', error);
        }
        return false;
    }
}
