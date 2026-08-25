/**
 * Virtual filesystem module for the terminal.
 *
 * Wrapped in an IIFE so `FileSystem` (the actual tree of files/directories)
 * stays private; only the public API (window.FileSystemAPI) and the
 * window.FileDevices helpers for /dev/* files are exposed globally.
 *
 * Each node in the tree is a plain object with a `type` of "dir", "file",
 * "symlink", or "device", plus standard Unix-like metadata (mode, owner,
 * group, created/modified/accessed timestamps) and either `children`
 * (for dirs), `content` (for files), or `target` (for symlinks).
 *
 * `FileSystem` below is the *default* seed tree the terminal starts with
 * (or resets to) — it includes a starter /home/guest with a resume,
 * contact info, a readme, and a hidden self-test shell script.
 */
(function() {
    let FileSystem = {

    "/": {
        type: "dir",
        hidden: false,
        mode: "rwxr-xr-x",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        children: {
            home: {
                type: "dir",
                hidden: false,
                mode: "rwxr-xr-x",
                owner: "root",
                group: "root",
                created: Date.parse("2020-01-01T08:00:00Z"),
                modified: Date.parse("2026-07-01T10:00:00Z"),
                accessed: Date.parse("2026-07-01T10:00:00Z"),
                children: {
                    guest:{
                        type: "dir",
                        hidden: false,
                        mode: "rwxr-x---",
                        owner: "guest",
                        group: "guest",
                        created: Date.parse("2020-01-01T08:00:00Z"),
                        modified: Date.parse("2026-07-01T10:00:00Z"),
                        accessed: Date.parse("2026-07-01T10:00:00Z"),
                        children: {
                            "resume.md": {
                                type: "file",
                                hidden: false,       
                                mode: "rw-r--r--",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                // Bump this whenever this file's shipped
                                // content changes - see reconcileSeed()
                                // below for what that does with it.
                                seedVersion: 1,
                                content: `I'm Torvos (contact@torvos.ca) a senior cloud architecture and cybersecurity leader with more than 23 years of experience 
delivering enterprise technology solutions. Recognized for leading cloud modernization initiatives, establishing enterprise 
architecture and security strategies, building high-performing technical teams, and advising executives on cloud adoption, 
cybersecurity, DevSecOps, and digital transformation.

----------- Skills and Expertise -----------
 - Security: Proficient in network security, threat analysis, risk management, and incident response.
 - Architecture: Skilled in designing and optimizing secure solutions and environments.
 - Technical Expertise: Deep understanding of cloud environments (Azure, AWS), security operations, and application development.
 - Leadership and Mentorship: Guiding teams and providing expert advice on technology and security.
 - Advice and Guidance: Experienced in providing advising and guiding to senior management.
 - Collaboration: Building partnerships with internal and external stakeholders.

----------- Professional Journey -----------
Manager/Senior Advisor - Cloud Cyber Security Architecture and Integration
 - Established secure and flexible cloud connectivity patterns to enhance cyber security.
 - Advised various departments on cloud adoption strategies and best practices.
 - Coached and mentored cloud and SaaS teams, ensuring alignment with security policies and standards.
 - Facilitated the integration of cloud solutions into existing IT infrastructures, improving overall security posture.

Manager/Senior Advisor - Cloud Engineering & Operations
 - Staffed up cloud operations teams responsible for multiple cloud environments, including Azure and AWS.
 - Oversaw cloud operations that supported a large public sector organization, ensuring high availability and performance.
 - Provided expert advice on cloud practices and technology implementations.
 - Provided leadership and strategic direction for cloud technology adoption in public sector.
 - Developed and maintained cloud operational standards and best practices.
 - Collaborated with internal and external stakeholders to drive cloud initiatives.

Team Leader/Technology Advisor - IT/Cyber Security
 - Led vulnerability management and incident response activities, ensuring timely mitigation of risks.
 - Provided technical expertise in cyber security operations and strategy development.
 - Developed and implemented security policies and procedures to safeguard information assets.
 - Conducted security assessments and audits to identify and address potential threats.

Team Leader - IT/Cyber Security
 - Managed digital identity and access management projects, enhancing security and user experience.
 - Led the implementation of advanced authentication mechanisms and access control policies.
 - Coordinated with cross-functional teams to ensure secure integration of new technologies.
 - Conducted training sessions and workshops on cyber security awareness and best practices.

Systems Analyst - Solutions Architecture
 - Created solution architectures for complex IT projects, aligning with organizational goals.
 - Provided guidance on technology selection and integration for enterprise solutions.
 - Collaborated with project managers and developers to ensure successful project delivery.
 - Developed technical documentation and architecture diagrams to support project implementation.

Systems Analyst - Enterprise Architecture
 - Developed solution architectures for enterprise management systems, enhancing efficiency and scalability.
 - Conducted technology evaluations and recommended solutions to meet business needs.
 - Engaged with stakeholders to gather requirements and ensure alignment with enterprise architecture standards.
 - Provided oversight and guidance on the implementation of architectural frameworks.

Lead Developer - Application Development
 - Led development team, ensuring timely delivery and high quality.
 - Collaborated with interdepartmental teams to design and develop innovative solutions.
 - Conducted code reviews and provided mentorship to junior developers.

Developer - Application Development
 - Developed applications for HR services, improving efficiency and user satisfaction.
 - Developed a project management solution application used across the branch to transparently track the status of projects.
 - Participated in the entire software development lifecycle, from requirements gathering to deployment.`
                            },
                            "contact.md": {
                                type: "file",
                                hidden: false,
                                mode: "rw-r--r--",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                seedVersion: 1,
                                content: `+--------------------------------------------------------+
| - Email: contact@torvos.ca                             |
| - GitHub: https://github.com/torvos                    |
| - Bluesky: https://bsky.app/profile/torvos.bsky.social |
+--------------------------------------------------------+`},
                            "readme.md": {
                                type: "file",
                                hidden: false,
                                mode: "rw-r--r--",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                seedVersion: 1,
                                content: `This site is a terminal emulator, commands aren't run on an actual server everything is done locally on your device including the filesystem.`},
                            ".script.sh":{
                                type: "file",
                                hidden: true,
                                mode: "rwxr-xr-x",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                seedVersion: 2,
                                "content": "#!/bin/sh\necho \"========================================\"\necho \" Torvos Terminal Shell Test\"\necho \"========================================\"\necho \"\"\n\nerrors=0\nadderror=1\n\necho \"[TEST] Basic echo\"\nresults=$(echo \"Hello, terminal!\")\nif [ \"$results\" == \"Hello, terminal!\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Basic echo works\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Basic echo failed\"\n errors=$((errors+adderror))\nfi\nresults=$(echo \"Multiple\" \"arguments\" \"work\")\nif [ \"$results\" == \"Multiple arguments work\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Multi Argument echo works\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Multi Argument echo failed\"\n errors=$((errors+adderror)) \nfi\necho \"Test ; with | things == that would 'break things'\" > echotest.txt\nresults=\"$(cat echotest.txt)\"\nexpected=\"Test ; with | things == that would 'break things'\"\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Echo with ; | == ' ' works\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Echo with ; | == ' ' failed\"\n errors=$((errors+adderror)) \nfi\nrm echotest.txt\n\necho \"---------------------------------------------\"\necho \"[TEST] Variables\"\nname=\"Alice\"\nnumber=10\nif [ \"$name\" == \"Alice\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: string comparison\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: string comparison\"\n errors=$((errors+adderror)) \nfi\nif [ \"$name\" != \"Bob\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: != comparison\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: != comparison\"\n errors=$((errors+adderror)) \nfi\nunset name\nunset number\n\necho \"---------------------------------------------\"\necho \"[TEST] Arithmetic\"\na=10\nb=5\nresults=$(echo \"a + b = $((a + b))\")\nif [ \"$results\" == \"a + b = 15\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: a + b tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: a + b failed\"\n errors=$((errors+adderror)) \nfi\nresults=$(echo \"a - b = $((a - b))\")\nif [ \"$results\" == \"a - b = 5\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: a - b tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: a - b failed\"\n errors=$((errors+adderror)) \nfi\nresults=$(echo \"a * b = $((a * b))\")\nif [ \"$results\" == \"a * b = 50\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: a * b tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: a * b failed\"\n errors=$((errors+adderror)) \nfi\nresults=$(echo \"a / b = $((a / b))\")\nif [ \"$results\" == \"a / b = 2\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: a / b tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: a / b failed\"\n errors=$((errors+adderror)) \nfi\nresults=$(echo \"a % b = $((a % b))\")\nif [ \"$results\" == \"a % b = 0\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: a % b tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: a % b failed\"\n errors=$((errors+adderror)) \nfi\nresults=$(echo \"complex = $((a * 2 + b * 3))\")\nif [ \"$results\" == \"complex = 35\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: complex arithmetic tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: complex arithmetic failed\"\n errors=$((errors+adderror)) \nfi\nunset a\nunset b\nunset results\n\necho \"---------------------------------------------\"\necho \"[TEST] Filesystem\"\nmkdir test\nif [ -d test ]; then\n echo -e \"\\e[32mPASS\\e[0m: Directory created successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Directory creation failed\"\n errors=$((errors+adderror))\nfi\ncd test\nresults=$(pwd)\nif [ \"$results\" == \"/home/guest/test\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Directory changed successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Directory change failed\"\n errors=$((errors+adderror))\nfi\ntouch test.txt\necho \"this is a test\" > test.txt\nresults=$(cat test.txt)\nif [ \"$results\" == \"this is a test\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: File created and written successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: File creation or writing failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] Append redirection\"\necho \"second line\" >> test.txt\nresults=$(cat test.txt)\nexpected=$'this is a test\\nsecond line'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: File appended >> successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: File append >> failed\"\n errors=$((errors+adderror))\nfi\necho \"third line\" >> test.txt\nresults=$(cat test.txt)\nexpected=$'this is a test\\nsecond line\\nthird line'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Secondary file appended >> successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Seondary file append >> failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[PREP] Creating multiple files for additional tests\"\ntouch file1.txt\ntouch file2.txt\ntouch file3.log\ntouch another.txt\necho \"one\" > file1.txt\necho \"two\" > file2.txt\necho \"three\" > file3.log\necho \"another\" > another.txt\n\necho \"---------------------------------------------\"\necho \"[TEST] Wildcards\"\nresults=$(ls *.txt)\nexpected=$'test.txt\\nfile1.txt\\nfile2.txt\\nanother.txt'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Wildcard tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Wildcard failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] File tests\"\nif [ -f test.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: test.txt exists and is a file\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: test.txt file test\"\n errors=$((errors+adderror))\nfi\nif [ -d . ]; then\n echo -e \"\\e[32mPASS\\e[0m: current directory is a directory\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: directory test\"\n errors=$((errors+adderror))\nfi\nif [ -e test.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: -e test\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: -e test\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] cp\"\ncp test.txt copy.txt\nif [ -f copy.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: copy created\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: copy not created\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] mv\"\nmv copy.txt moved.txt\nif [ -f moved.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: move successful\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: move failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] touch\"\ntouch touched.txt\nif [ -f touched.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: touch\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: touch\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] cat/head/tail\"\necho \"line 1\" > lines.txt\necho \"line 2\" >> lines.txt\necho \"line 3\" >> lines.txt\necho \"line 4\" >> lines.txt\necho \"line 5\" >> lines.txt\nresults=$(head -n 2 lines.txt)\nexpected=$'line 1\\nline 2'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Head -n 2 tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Head -n 2 test failed\"\n errors=$((errors+adderror))\nfi\nresults=$(tail -n 2 lines.txt)\nexpected=$'line 4\\nline 5'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Tail -n 2 tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Tail -n 2 test failed\"\n errors=$((errors+adderror)) \nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] sort/uniq\"\necho \"banana\" > fruits.txt\necho \"apple\" >> fruits.txt\necho \"orange\" >> fruits.txt\necho \"apple\" >> fruits.txt\necho \"banana\" >> fruits.txt\n\nresults=$(sort fruits.txt)\nexpected=$'apple\\napple\\nbanana\\nbanana\\norange'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: sort tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: sort test failed\"\n errors=$((errors+adderror)) \nfi\n\nresults=$(sort fruits.txt | uniq)\nexpected=$'apple\\nbanana\\norange'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: unique sort tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: unique sort test failed\"\n errors=$((errors+adderror)) \nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] Pipeline\"\n\nresults=$(cat fruits.txt | sort)\nexpected=$'apple\\napple\\nbanana\\nbanana\\norange'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: single pipeline tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: single pipeline test failed\"\n errors=$((errors+adderror)) \nfi\n\nresults=$(cat fruits.txt | sort | uniq)\nexpected=$'apple\\nbanana\\norange'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: dual pipeline tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: dual pipeline test failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] grep\"\nresults=$(grep apple fruits.txt)\nexpected=$'apple\\napple'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: first grep tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: first grep test failed\"\n errors=$((errors+adderror))\nfi\nresults=$(grep banana fruits.txt)\nexpected=$'banana\\nbanana'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: second grep tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: second grep test failed\"\n errors=$((errors+adderror))\nfi\n\n\necho \"---------------------------------------------\"\necho \"[TEST] sed\"\nresults=$(sed 's/apple/APPLE/' fruits.txt)\nexpected=$'banana\\nAPPLE\\norange\\nAPPLE\\nbanana'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: sed tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: sed test failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] wc\"\nresults=$(wc lines.txt)\nexpected=$'Lines: 5  Words: 10  Bytes: 34   lines.txt'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: first wc tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: first wc test failed\"\n errors=$((errors+adderror))\n\nfi\nresults=$(wc fruits.txt)\nexpected=$'Lines: 5  Words: 5  Bytes: 32   fruits.txt'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: second wc tested successfully\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: second wc test failed\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] Exit status\"\ntrue\nif [ $? -eq 0 ]; then\n echo -e \"\\e[32mPASS\\e[0m: true returned 0\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: true returned non-zero\"\n errors=$((errors+adderror))\nfi\n\nfalse\nif [ $? -ne 0 ]; then\n echo -e \"\\e[32mPASS\\e[0m: false returned non-zero\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: false returned 0\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] if / elif / else\"\nvalue=2\nif [ \"$value\" -eq 1 ]; then\n echo -e \"\\e[31mFAIL\\e[0m: value is two but if branch executed\"\n errors=$((errors+adderror)) \nelif [ \"$value\" -eq 2 ]; then\n echo -e \"\\e[32mPASS\\e[0m: elif\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: else branch\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] Numeric comparisons\"\nif [ 5 -eq 5 ]; then echo -e \"\\e[32mPASS\\e[0m: -eq\"; else errors=$((errors+adderror)); fi\nif [ 5 -ne 6 ]; then echo -e \"\\e[32mPASS\\e[0m: -ne\"; else errors=$((errors+adderror)); fi\nif [ 3 -lt 5 ]; then echo -e \"\\e[32mPASS\\e[0m: -lt\"; else errors=$((errors+adderror)); fi\nif [ 3 -le 3 ]; then echo -e \"\\e[32mPASS\\e[0m: -le\"; else errors=$((errors+adderror)); fi\nif [ 5 -gt 3 ]; then echo -e \"\\e[32mPASS\\e[0m: -gt\"; else errors=$((errors+adderror)); fi\nif [ 5 -ge 5 ]; then echo -e \"\\e[32mPASS\\e[0m: -ge\"; else errors=$((errors+adderror)); fi\n\necho \"---------------------------------------------\"\necho \"[TEST] Negation\"\nif ! [ 1 -eq 2 ]; then\n echo -e \"\\e[32mPASS\\e[0m: !\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: !\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] for loop\"\nnumber=0\nadd=1\nfor item in one two three\ndo\n number=$((number+add))\ndone\nif [ \"$number\" -eq 3 ]; then\n echo -e \"\\e[32mPASS\\e[0m: for loop\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: for loop\"\n errors=$((errors+adderror))\nfi\nunset number\nunset add\n\necho \"---------------------------------------------\"\necho \"[TEST] for loop + glob\"\ncounter=0\nfor file in *.txt\ndo\n counter=$((counter + 1))\ndone\nif [ \"$counter\" -eq 8 ]; then\n echo -e \"\\e[32mPASS\\e[0m: for loop + glob\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: for loop + glob\"\n errors=$((errors+adderror))\n env counter\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] while loop\"\ncounter=0\nwhile [ \"$counter\" -lt 3 ]\ndo\n counter=$((counter + 1))\ndone\nif [ \"$counter\" -eq 3 ]; then\n echo -e \"\\e[32mPASS\\e[0m: while loop\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: while loop\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] continue\"\ncounter=0\nwhile [ \"$counter\" -lt 3 ]\ndo\n counter=$((counter + 1))\n if [ \"$counter\" -eq 2 ]; then\n continue\n fi\n done\nif [ \"$counter\" -eq 3 ]; then\n echo -e \"\\e[32mPASS\\e[0m: continue\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: continue\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] break\"\ncounter=0\nwhile [ \"$counter\" -lt 10 ]\ndo\n counter=$((counter + 1))\n if [ \"$counter\" -eq 3 ]; then\n break\n fi\n done\nif [ \"$counter\" -eq 3 ]; then\n echo -e \"\\e[32mPASS\\e[0m: break\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: break\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] Environment\"\nexport TEST_VARIABLE=\"hello\"\nif [ \"$TEST_VARIABLE\" == \"hello\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: Environment variable set\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: Environment variable not set\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] unset\"\nunset TEST_VARIABLE\nif [ -z \"$TEST_VARIABLE\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: unset\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: unset\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] ln\"\nln -s test.txt linked.txt\nif [ -e linked.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: link created\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: link creation\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] rm\"\nrm touched.txt\nif [ ! -e touched.txt ]; then\n echo -e \"\\e[32mPASS\\e[0m: rm\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: rm\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] rmdir\"\nmkdir emptydir\nif [ -d emptydir ]; then\n echo -e \"\\e[32mPASS\\e[0m: mkdir\"\nfi\nrmdir emptydir\nif [ ! -e emptydir ]; then\n echo -e \"\\e[32mPASS\\e[0m: rmdir\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: rmdir\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] which\"\nresults=$(which ls)\nexpected=\"/bin/ls\"\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: which\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: which\"\n errors=$((errors+adderror))\n env results\n env expected\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] uname\"\nresults=$(uname)\nif [ \"$results\" == \"Torvos\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: uname\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: uname\"\n errors=$((errors+adderror))\nfi\nresults=$(uname -a)\nexpected=\"Torvos torvos 3.0.0 x86_64 GNU/Torvos\"\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: uname -a\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: uname -a\"\n errors=$((errors+adderror))\nfi\nresults=$(uname -sr)\nif [ \"$results\" == \"Torvos 3.0.0\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: uname -sr\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: uname -sr\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] hostname\"\nresults=$(hostname)\nif [ \"$results\" == \"torvos\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: hostname\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: hostname\"\n errors=$((errors+adderror))\nfi\nhostname newname 2> hostnameerr.txt\nresults=$(cat hostnameerr.txt)\nif [ \"$results\" == \"hostname: you must be root to change the host name\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: hostname change blocked for guest\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: hostname change should have been blocked\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] id\"\nresults=$(id)\nexpected=\"uid=1000(guest) gid=1000(guest) groups=1000(guest)\"\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: id\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: id\"\n errors=$((errors+adderror))\nfi\nresults=$(id -u)\nif [ \"$results\" == \"1000\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: id -u\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: id -u\"\n errors=$((errors+adderror))\nfi\nresults=$(id -un)\nif [ \"$results\" == \"guest\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: id -un\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: id -un\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] base64\"\nresults=$(echo \"hello world\" | base64)\nif [ \"$results\" == \"aGVsbG8gd29ybGQ=\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: base64 encode\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: base64 encode\"\n errors=$((errors+adderror))\nfi\nresults=$(echo \"aGVsbG8gd29ybGQ=\" | base64 -d)\nif [ \"$results\" == \"hello world\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: base64 decode\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: base64 decode\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] md5sum / sha256sum\"\nresults=$(echo \"abc\" | md5sum)\nexpected=\"900150983cd24fb0d6963f7d28e17f72  -\"\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: md5sum\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: md5sum\"\n errors=$((errors+adderror))\nfi\nresults=$(echo \"abc\" | sha256sum)\nexpected=\"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  -\"\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: sha256sum\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: sha256sum\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] diff\"\necho \"line1\" > diffa.txt\necho \"line2\" >> diffa.txt\necho \"line1\" > diffb.txt\necho \"lineTWO\" >> diffb.txt\nresults=$(diff diffa.txt diffb.txt)\nexpected=$'2c2\\n< line2\\n---\\n> lineTWO'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: diff detects differences\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: diff detects differences\"\n errors=$((errors+adderror))\nfi\nresults=$(diff diffa.txt diffa.txt)\nif [ -z \"$results\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: diff identical files\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: diff identical files\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] less\"\nresults=$(less test.txt)\nexpected=$'this is a test\\nsecond line\\nthird line'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: less\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: less\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] neofetch\"\nresults=$(neofetch)\nif [ -n \"$results\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: neofetch produced output\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: neofetch produced no output\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] echo -n / -e\"\nresults=$(echo -e \"line1\\nline2\")\nexpected=$'line1\\nline2'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: echo -e interprets escapes\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: echo -e interprets escapes\"\n errors=$((errors+adderror))\nfi\nresults=$(echo -n \"flag consumed\")\nif [ \"$results\" == \"flag consumed\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: echo -n recognized as a flag\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: echo -n recognized as a flag\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] date\"\nresults=$(date +%Y)\nif [ \"$results\" -gt 2020 ]; then\n echo -e \"\\e[32mPASS\\e[0m: date +%Y returns a plausible year\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: date +%Y returns a plausible year\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] uptime\"\nresults=$(uptime)\nif [ -n \"$results\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: uptime produced output\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: uptime produced no output\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] printf\"\nresults=$(printf \"%s is %d\" torvos 5)\nif [ \"$results\" == \"torvos is 5\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: printf %s %d\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: printf %s %d\"\n errors=$((errors+adderror))\nfi\nresults=$(printf \"%-10s|%5d|\" left 3)\nif [ \"$results\" == \"left      |    3|\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: printf width padding\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: printf width padding\"\n errors=$((errors+adderror))\nfi\nresults=$(printf \"%s-%s\\n\" a b c d)\nexpected=$'a-b\\nc-d'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: printf repeats format for extra args\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: printf repeats format for extra args\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] tr\"\nresults=$(echo hello | tr a-z A-Z)\nif [ \"$results\" == \"HELLO\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: tr translate\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: tr translate\"\n errors=$((errors+adderror))\nfi\nresults=$(echo \"a1b2c3\" | tr -d '0-9')\nif [ \"$results\" == \"abc\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: tr -d delete\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: tr -d delete\"\n errors=$((errors+adderror))\nfi\nresults=$(echo \"aaabbbccc\" | tr -s 'a-c')\nif [ \"$results\" == \"abc\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: tr -s squeeze\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: tr -s squeeze\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] Locked network recon commands\"\nnmap 127.0.0.1 2> lockederr.txt\nresults=$(cat lockederr.txt)\nif [ \"$results\" == \"guest users are not permitted to run the nmap command.\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: nmap blocked for guest\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: nmap blocked for guest\"\n errors=$((errors+adderror))\nfi\nwhois torvos.ca 2> lockederr.txt\nresults=$(cat lockederr.txt)\nif [ \"$results\" == \"guest users are not permitted to run the whois command.\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: whois blocked for guest\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: whois blocked for guest\"\n errors=$((errors+adderror))\nfi\ndig torvos.ca 2> lockederr.txt\nresults=$(cat lockederr.txt)\nif [ \"$results\" == \"guest users are not permitted to run the dig command.\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: dig blocked for guest\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: dig blocked for guest\"\n errors=$((errors+adderror))\nfi\nnslookup torvos.ca 2> lockederr.txt\nresults=$(cat lockederr.txt)\nif [ \"$results\" == \"guest users are not permitted to run the nslookup command.\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: nslookup blocked for guest\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: nslookup blocked for guest\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] fortune\"\nresults=$(fortune)\nif [ -n \"$results\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: fortune produced output\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: fortune produced no output\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] cowsay\"\nresults=$(cowsay hi | head -n 3)\nexpected=$' ____\\n< hi >\\n ----'\nif [ \"$results\" == \"$expected\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: cowsay speech bubble\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: cowsay speech bubble\"\n errors=$((errors+adderror))\nfi\n\necho \"---------------------------------------------\"\necho \"[TEST] sl\"\nresults=$(sl | head -n 1)\nif [ \"$results\" == \"Did you mean 'ls'? Too late.\" ]; then\n echo -e \"\\e[32mPASS\\e[0m: sl easter egg\"\nelse\n echo -e \"\\e[31mFAIL\\e[0m: sl easter egg\"\n errors=$((errors+adderror))\nfi\n\necho \"\"\necho \"========================================\"\necho \" Shell test completed\"\nif [ \"$errors\" -eq 0 ]; then\n echo \" All tests passed!\"\nelse\n echo \" $errors test(s) failed.\"\nfi\necho \"========================================\"\n#cleanup\ncd ..\nrm -rf test\nunset results\nunset expected\nunset item\nunset adderror\nunset value\nunset counter\nunset file\nunset errors"
                            }
                        }                            
                    }
                }
            }
        }
    }
    };

    // Snapshot of the default tree (as JSON) kept around so the filesystem
    // can be restored to factory defaults (via `reset` or a corrupted save).
    const DEFAULT_FILESYSTEM_JSON = JSON.stringify(FileSystem);

    /**
     * Recursively visits every node in `node`'s subtree that carries a
     * `seedVersion` field, calling `visit(node, absolutePath)` for each -
     * used by reconcileSeed() to find the small set of "seed content"
     * files (currently the starter files under /home/guest) without
     * needing a hardcoded list of their paths kept in sync by hand.
     * @param {Object} node
     * @param {string} path - Absolute path of `node` itself.
     * @param {(node: Object, path: string) => void} visit
     */
    function walkSeedNodes(node, path, visit) {
        if (!node) {
            return;
        }
        if (Object.prototype.hasOwnProperty.call(node, "seedVersion")) {
            visit(node, path);
        }
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                walkSeedNodes(
                    node.children[key],
                    path === ROOT ? `${ROOT}${key}` : `${path}${ROOT}${key}`,
                    visit
                );
            }
        }
    }

    /**
     * Walks an absolute path (already normalized, no "." or "..") down from
     * root, resolving through any symlinks encountered along the way.
     * @param {string} path - Absolute path to resolve.
     * @param {number} [depth=0] - Symlink-following recursion depth guard.
     * @returns {{node: Object, path: string}|null} The resolved node and its
     *   final (post-symlink) path, or null if any segment doesn't exist or
     *   symlinks recurse too deep (possible loop).
     */
    function resolvePath(path, depth = 0) {
        if (depth > 20) {return null;} // guards against symlink loops
        const parts = path.replace("~", "").split(ROOT).filter(Boolean);
        let node = FileSystem[ROOT];
        let currentPath = ROOT;
        for (const part of parts) {
            if (!node.children || !node.children[part]) {return null;}
            node = node.children[part];
            currentPath = currentPath === ROOT
                ? ROOT + part
                : currentPath + ROOT + part;
            while (node.type === "symlink") {
                const linkTarget = node.target.startsWith(ROOT)
                    ? node.target
                    : resolveRelativePath(
                        currentPath.substring(0, currentPath.lastIndexOf(ROOT)),
                        node.target
                    );
                const result = resolvePath(linkTarget, depth + 1);
                if (!result) {
                    return null;
                }
                node = result.node;
                currentPath = result.path;
            }
        }
        return {
            node,
            path: currentPath
        };
    }

    /**
     * Resolves a possibly-relative, possibly "~"-prefixed path into a
     * normalized absolute path (no "." or ".." segments), relative to `cwd`.
     * @param {string} cwd - Current working directory (absolute path).
     * @param {string} path - Path to resolve; may be relative, absolute,
     *   ".", "~", or "~/...".
     * @returns {string} Normalized absolute path.
     */
    function resolveRelativePath(cwd, path) {
        // Collapses "." and ".." segments and re-joins into an absolute path
        function normalizePath(path) {
            const parts = [];
            for (const part of path.split(ROOT)) {
                if (!part || part === ".") {continue;}
                if (part === "..") {
                    if (parts.length > 0) {
                        parts.pop();
                    }
                    continue;
                }
                parts.push(part);
            }
            return ROOT + parts.join(ROOT);
        }
        if (!path || path === ".") {return cwd;}
        if (path === "~") {return HOME;}
        if (path.startsWith("~/")) {path = HOME + path.slice(1);}
        if (path.startsWith(ROOT)) {return normalizePath(path);}
        return normalizePath(`${cwd}/${path}`);
    }

    /**
     * Walks `fullPath` (already normalized/absolute) segment by segment
     * from root, returning true as soon as it encounters a node flagged
     * `protected: true` - either root itself, some ancestor directory
     * along the way (e.g. /bin or /dev), or the final node. Stops (and
     * returns false) as soon as a segment doesn't exist, which correctly
     * handles not-yet-created targets too: e.g. for "mkdir /bin/new",
     * the walk reaches the existing, protected "bin" node and returns
     * true immediately, before ever needing "new" to exist.
     * @param {string} fullPath
     * @returns {boolean}
     */
    function isProtectedPath(fullPath) {
        let node = FileSystem[ROOT];
        if (node.protected) return true;
        for (const part of fullPath.split(ROOT).filter(Boolean)) {
            if (!node.children || !node.children[part]) return false;
            node = node.children[part];
            if (node.protected) return true;
        }
        return false;
    }

    /**
     * Finds the parent directory node of an absolute path, without
     * resolving symlinks along the way for the final segment.
     * @param {string} path - Absolute path.
     * @returns {{parent: Object, name: string}|null} The parent directory
     *   node and the final path segment's name, or null if any ancestor
     *   directory doesn't exist.
     */
    function getParentDirectory(path) {
        const parts = path.split(ROOT).filter(Boolean);
        if (parts.length === 0) {return null;}
        const name = parts.pop();
        let parent = FileSystem[ROOT];
        for (const part of parts) {
            if (!parent.children || !parent.children[part]) {return null;}
            parent = parent.children[part];
            if (parent.type !== "dir") {return null;}
        }
        return {parent,name};
    }

    /**
     * Converts a numeric permission string (e.g. "755") into the symbolic
     * "rwxr-xr-x" form used for display/storage.
     * @param {string} value - Numeric mode, e.g. "0755" or "755".
     * @returns {string} 9-character symbolic permission string.
     */
    function numericToMode(value) {
        value = value.slice(-3); // only the last 3 digits (owner/group/other) matter
        const map = {
            0: "---",
            1: "--x",
            2: "-w-",
            3: "-wx",
            4: "r--",
            5: "r-x",
            6: "rw-",
            7: "rwx"
        };
        return (
            map[value[0]] +
            map[value[1]] +
            map[value[2]]
        );
    }

    /**
     * Applies a chmod-style symbolic permission change (e.g. "u+x", "go-w",
     * "a=rw") to an existing 9-character mode string, as used by the
     * `chmod` command.
     * @param {string} current - Existing 9-char symbolic mode string.
     * @param {string} operation - Symbolic operation, matching /^([ugoa]+)([+-=])([rwx]+)$/.
     * @returns {string} The updated 9-character mode string (unchanged if
     *   `operation` doesn't match the expected pattern).
     */
    function symbolicToMode(current, operation) {
        let chars = current.split("");
        const groups = {
            u: [0,1,2],
            g: [3,4,5],
            o: [6,7,8],
            a: [0,1,2,3,4,5,6,7,8]
        };
        const match = operation.match(/^([ugoa]+)([+-=])([rwx]+)$/);
        if (!match) {
            return current;
        }
        const users = match[1];
        const action = match[2];
        const permissions = match[3];
        for (const user of users) {
            const indexes = groups[user];
            for (const perm of permissions) {
                let offset;
                if (perm === "r") offset = 0;
                if (perm === "w") offset = 1;
                if (perm === "x") offset = 2;
                for (const index of indexes) {
                    const relative = index % 3;
                    if (relative === offset) {
                        if (action === "+") {
                            chars[index] = perm;
                        }
                        else if (action === "-") {
                            chars[index] = "-";
                        }
                        else if (action === "=") {
                            chars[index] = "-";
                        }
                    }
                }
            }
            if (action === "=") {
                for (const index of indexes) {
                    chars[index] = "-";
                }
                for (const perm of permissions) {
                    let offset;
                    if (perm === "r") offset = 0;
                    if (perm === "w") offset = 1;
                    if (perm === "x") offset = 2;
                    for (const index of indexes) {
                        if (index % 3 === offset) {
                            chars[index] = perm;
                        }
                    }
                }
            }
        }
        return chars.join("");
    }

    /**
     * Formats a byte count into a human-readable size string with a
     * K/M/G/T/P unit suffix (e.g. `ls -h`, `df`, `du`-style output).
     */
    function formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes}B`;
        }
        const units = ["K", "M", "G", "T"];
        let size = bytes;
        for (const unit of units) {
            size /= 1024;
            if (size < 1024) {
                return `${size.toFixed(1)}${unit}`;
            }
        }
        return `${size.toFixed(1)}P`;
    }

    /**
     * Recursively computes the total size in bytes of a node: for a file,
     * its UTF-8 encoded content length; for a directory, the sum of all
     * descendant files.
     */
    function getDirectorySize(node) {
        if (!node) {
            return 0;
        }
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        let total = 0;
        for (const child of Object.values(node.children || {})) {
            total += getDirectorySize(child);
        }
        return total;
    }

    /**
     * Returns a node's "size" for `ls -l`-style display purposes: byte
     * length for files, or immediate child count for directories (not
     * recursive, unlike getDirectorySize).
     */
    function getSize(node) {
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        if (node.type === "dir") {
            return Object.keys(node.children || {}).length;
        }
        return 0;
    }

    // Formats a timestamp for `ls -l`-style display (e.g. "Jul 01, 10:00").
    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleString("en-CA", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    /**
     * Computes the "link count" column shown by `ls -l`. Files always
     * report 1; directories mimic Unix's convention of 2 (for "." and its
     * own entry in the parent) plus one for each immediate subdirectory
     * (each of which has a ".." pointing back).
     */
    function getLinkCount(node) {
        if (node.type === "file") {
            return 1;
        }
        const subdirs = Object.values(node.children || {})
            .filter(child => child.type === "dir")
            .length;
        return 2 + subdirs;
    }

    /**
     * Formats a single filesystem entry as an `ls -l` long-format line:
     * type+permissions, link count, owner, group, size, modified date, name
     * (with a trailing "/" for dirs, or "-> target" for symlinks).
     */
    function formatLongEntry(name, node) {
        const typeChar = node.type === "dir" ? "d" : node.type === "symlink" ? "l" : node.type === "device" ? "c" : "-";
        const mode = node.mode;
        const links = getLinkCount(node);
        const group = node.group;
        const size = getDirectorySize(node);
        const modified = formatDate(node.modified);    const owner = node.owner;
        return `${typeChar}${mode} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${String(size).padStart(6)} ${modified} ${name}${node.type === "dir" ? "/" : ""}${node.type === "symlink" ? ` -> ${node.target}` : ""}`;
    }

    // Creates a new symlink node pointing at `target` (used by `ln -s`).
    function createLink(target) {
        const now = Date.now();
        return {
            type: "symlink",
            target: target,
            mode: "rwxrwxrwx",
            owner: "guest",
            group: "guest",
            created: now,
            modified: now
        };
    }

    // Creates a new empty file node with default owner/permissions
    // (used by `touch`, redirection, etc).
    function createFile(hidden = false) {
        const now = Date.now();
        return {
            type: "file",
            hidden,
            mode: "rw-r--r--",
            owner: "guest",
            group: "guest",
            created: now,
            modified: now,
            accessed: now,
            content: ""
        };
    }

    // Creates a new empty directory node with default owner/permissions
    // (used by `mkdir`).
    function createDirectory(hidden = false) {
        const now = Date.now();
        return {
            type: "dir",
            hidden,
            mode: "rwxr-xr-x",
            owner: "guest",
            group: "guest",
            created: now,
            modified: now,
            accessed: now,
            children: {}
        };
    }

    /**
     * Expands a glob-style argument containing "*" and/or "?" wildcards
     * into all matching absolute paths in the filesystem, walking segment
     * by segment (so wildcards can appear in any path component, not just
     * the final one, e.g. "/home/*\/*.txt").
     * @param {string} arg - The raw argument, possibly containing wildcards.
     * @param {string} [cwd="/"] - Current working directory for relative resolution.
     * @returns {string[]} All matching paths. If `arg` contains no
     *   wildcard characters at all, it's returned unchanged as a single-
     *   element array (`[arg]`) - there's nothing to expand. An empty
     *   array specifically means `arg` DID look like a glob but matched
     *   nothing; callers (see execute.js, sh.js) treat that case as "fall
     *   back to the literal pattern", matching a real shell's default
     *   behavior for an unmatched glob.
     */
    function expandWildcards(arg, cwd = "/") {
        if (!arg.includes("*") && !arg.includes("?")) {
            return [arg];
        }
        const results = [];
        const pattern = arg.startsWith("/")
            ? arg
            : resolveRelativePath(cwd, arg);
        const parts = pattern.split("/");

        // Recursively walks the tree one path segment at a time, matching
        // literal segments exactly and wildcard segments via regex.
        function walk(node, index, currentPath) {
            if (index >= parts.length) {
                results.push(currentPath || "/");
                return;
            }
            const part = parts[index];
            if (part === "") {
                walk(node, index + 1, currentPath);
                return;
            }
            if (!node || !node.children) {
                return;
            }
            if (part.includes("*") || part.includes("?")) {
                const regex = new RegExp(
                    "^" +
                    part
                        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                        .replace(/\*/g, ".*")
                        .replace(/\?/g, ".")
                    +
                    "$"
                );
                // A bare "*"/"?" pattern shouldn't match hidden dotfiles -
                // real shells only do that if the pattern itself starts
                // with a literal "." (bash's `dotglob` is off by default).
                // Without this, something like `rm *` would silently sweep
                // up .script.sh along with everything else, which is both
                // surprising and not how any real shell behaves.
                const matchesHidden = part.startsWith(".");
                for (const name of Object.keys(node.children)) {
                    if (!matchesHidden && name.startsWith(".")) {
                        continue;
                    }
                    const child = node.children[name];
                    if (regex.test(name)) {
                        walk(
                            child,
                            index + 1,
                            currentPath + "/" + name
                        );
                    }
                }
            }
            else {
                const child = node.children[part];
                if (child) {
                    walk(
                        child,
                        index + 1,
                        currentPath + "/" + part
                    );
                }
            }
        }
        let startNode = FileSystem[ROOT];
        walk(
            startNode,
            0,
            ""
        );
        return results;
    }

    /**
     * Public filesystem API exposed globally. All path-taking methods
     * accept relative or absolute paths (resolved against `cwd`) unless
     * noted otherwise. Commands (js/commands/*.js) interact with the
     * virtual filesystem exclusively through this object.
     */
    window.FileSystemAPI = {

        // Returns the resolved node at `path` (following symlinks), or null if not found.
        get(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            const result = resolvePath(fullPath);

            if (!result || !result.node) {
                return null;
            }

            return result.node;
        },    

        // Normalizes `path` (relative or absolute) into an absolute path string.
        getFullPath(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            if (!fullPath) {
                return null;
            }
            return fullPath;
        },

        /**
         * True if `path` (or any ancestor directory containing it) is
         * flagged as a protected system location - currently /bin and
         * /dev, see bootstrap.js, which mounts each with `protected: true`.
         *
         * This intentionally isn't a hardcoded path-prefix check (that
         * was the old isInBin(), which only ever covered "/bin/" and
         * quietly left /dev completely unprotected). Protection now lives
         * as data on the node itself, so any future protected directory
         * just needs that one flag set when it's created/mounted, and
         * everything nested under it - including things added to it
         * later - is automatically covered without touching every
         * command in js/commands/ again.
         *
         * Callers that want files under a protected directory to remain
         * genuinely usable (e.g. /dev/null, /dev/random) rather than
         * fully locked away should combine this with isDevice(): block
         * when isProtected() is true AND the node ISN'T a device, so
         * reading/writing a device's simulated content still works
         * exactly as designed, while renaming/deleting/chmod'ing it (or
         * creating brand-new entries in /bin or /dev) stays blocked.
         *
         * Known limitation (shared with the old isInBin()): this checks
         * the path as typed, without following intermediate symlinks -
         * a symlink INTO a protected directory isn't itself caught here.
         * @param {string} path
         * @param {string} [cwd="/"]
         * @returns {boolean}
         */
        isProtected(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return isProtectedPath(fullPath);
        },

        // Accepts either a path string or an already-resolved node.
        isDirectory(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "dir";
        },

        // Accepts either a path string or an already-resolved node.
        isFile(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "file";
        },

        // Accepts either a path string or an already-resolved node. Note:
        // since get() already follows symlinks, this is mainly useful when
        // passed an already-fetched raw node (e.g. from getNode()).
        isSymlink(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "symlink";
        },

        // Accepts either a path string or an already-resolved node. True for
        // the virtual device files under /dev (null, zero, random, etc).
        isDevice(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            return node?.type === "device";
        },

        /**
         * Returns the readable content of a file OR device node. Regular
         * files return their stored `content` as usual; device nodes (e.g.
         * /dev/random) delegate to that device's read() handler in
         * window.FileDevices, generating their content on the fly instead
         * of reading a static string. This is the one method every command
         * should use to read a file's bytes, so device files "just work"
         * anywhere a regular file would.
         * @param {string|Object} pathOrNode - Path string or resolved node.
         * @param {string} [cwd] - Working directory to resolve a path against.
         * @returns {string} The content, or "" if the node/device is missing.
         */
        readContent(pathOrNode, cwd = "/") {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, cwd)
                : pathOrNode;

            if (!node) return "";

            if (node.type === "device") {
                const device = window.FileDevices?.[node.device];
                return device ? device.read() : "";
            }

            return node.content ?? "";
        },

        /**
         * Writes (or appends) content to a file OR device node. Regular
         * files store the text in `content` as usual; device nodes delegate
         * to that device's write() handler in window.FileDevices (which may
         * discard the data, as /dev/null does, or refuse it, as /dev/full
         * does) rather than actually storing it.
         * @param {string|Object} pathOrNode - Path string or resolved node.
         * @param {string} data - Text to write.
         * @param {Object} [options]
         * @param {boolean} [options.append=false] - Append instead of overwrite (files only).
         * @param {string} [options.cwd="/"] - Working directory, when pathOrNode is a path string.
         * @returns {boolean} true on success, false if the node is missing
         *   or the device refused the write (e.g. /dev/full).
         */
        writeContent(pathOrNode, data, options = {}) {
            const node = typeof pathOrNode === "string"
                ? this.get(pathOrNode, options.cwd ?? "/")
                : pathOrNode;

            if (!node) return false;

            if (node.type === "device") {
                const device = window.FileDevices?.[node.device];
                const ok = device ? device.write(data ?? "") : false;
                if (ok) node.modified = Date.now();
                return ok;
            }

            node.content = options.append
                ? ((node.content ?? "")
                    ? node.content + "\n" + (data ?? "")
                    : (data ?? ""))
                : (data ?? "");
            node.modified = Date.now();
            return true;
        },

        // Resolves `path` and returns the full {node, path} result (symlinks followed).
        resolve(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return resolvePath(fullPath);
        },
        
        // Returns {parent, name} for the parent directory node/basename of `path`.
        getParent(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return getParentDirectory(fullPath);
        },

        createFile(hidden = false) {
            return createFile(hidden);
        },

        createDirectory(hidden = false) {
            return createDirectory(hidden);
        },

        createLink(target) {
            return createLink(target);
        },

        getDirectorySize(node) {
            return getDirectorySize(node);
        },

        getSize(node) {
            return getSize(node);
        },

        getLinkCount(node) {
            return getLinkCount(node);
        },

        formatLongEntry(name, node) {
            return formatLongEntry(name, node);
        },

        formatDate(timestamp) {
            return formatDate(timestamp);
        },

        formatSize(bytes) {
            return formatSize(bytes);
        },

        numericToMode(value) {
            return numericToMode(value);
        },

        symbolicToMode(current, operation) {
            return symbolicToMode(current, operation);
        },

        expandWildcards(arg, cwd = "/") {
            return expandWildcards(arg, cwd);
        },
        
        // Looks up a node by absolute (or cwd-relative-to-root) path WITHOUT
        // following symlinks - returns the raw node as stored in the tree.
        getNode(path) {
            if (!path.startsWith(ROOT))
                path = resolveRelativePath(ROOT, path);

            let node = FileSystem[ROOT];
            const parts = path.split(ROOT).filter(Boolean);

            for (const part of parts) {
                if (!node.children || !node.children[part]) {
                    return null;
                }
                node = node.children[part];
            }
            return node;
        },

        // Attaches `node` as a new top-level child of root under `name`
        // (used by bootstrap.js to mount /bin and /dev).
        mount(name, node) {
            FileSystem[ROOT].children[name] = node;
        },

        // Serializes the entire filesystem tree to a JSON string (for localStorage).
        serialize() {
            return JSON.stringify(FileSystem);
        },

        /**
         * Replaces the in-memory filesystem with the parsed contents of
         * `json` (a previously-serialized tree). Falls back to the default
         * filesystem if parsing fails.
         * @returns {boolean} true if restore succeeded, false if the JSON
         *   was invalid and defaults were used instead.
         */
        restore(json) {
            try {
                FileSystem = JSON.parse(json);
                return true;
            } catch (e) {
                FileSystem = JSON.parse(DEFAULT_FILESYSTEM_JSON);
                return false;
            }
        },

        // Discards all changes and restores the original seed filesystem (used by `reset`).
        resetToDefault() {
            FileSystem = JSON.parse(DEFAULT_FILESYSTEM_JSON);
        },

        /**
         * Brings the small set of "seed content" files (currently the
         * starter files under /home/guest - resume.md, contact.md, etc.)
         * up to date with whatever the CURRENT code ships, without
         * touching anything else the user has created, moved, or edited
         * elsewhere in their filesystem.
         *
         * This replaces the old approach of wiping localStorage entirely
         * whenever TERMINAL_VERSION changed: that was a blunt instrument
         * for what's really a narrow problem ("I fixed a typo in
         * readme.md, existing users should get the fix") and it cost
         * users everything else they'd done in their session to deliver
         * it. Instead, each seed file carries its own `seedVersion` in
         * filesystem.js, bumped by hand only when that file's *content*
         * changes, and this reconciles against it, version by version:
         *
         *   - Locally at or past the shipped seedVersion already -> left
         *     alone completely (this is the common case on every boot).
         *   - Locally behind the shipped seedVersion (whether because the
         *     file is missing, was deleted, or was edited - reconcileSeed
         *     doesn't distinguish those, on purpose) -> replaced outright
         *     with the shipped content. These four files are meant to
         *     always reflect what ships in the code once you bump their
         *     version, not a permanent user sandbox - if you want a file
         *     users can edit and keep, don't give it a `seedVersion`.
         *
         * @param {Object.<string, number>} seedSync - Map of seed file
         *   path -> the last seedVersion reconciled for it, persisted in
         *   terminalSettings across reloads. Pass {} for a first run.
         * @returns {{seedSync: Object.<string, number>, changes: {path: string, action: "added"|"updated"}[]}}
         *   The updated map to persist back, plus a list of what changed
         *   (so the caller can let the user know, if it wants to).
         */
        reconcileSeed(seedSync = {}) {
            const updatedSync = { ...seedSync };
            const changes = [];
            const freshTree = JSON.parse(DEFAULT_FILESYSTEM_JSON);

            walkSeedNodes(freshTree[ROOT], ROOT, (freshNode, path) => {
                const result = getParentDirectory(path);
                if (!result) {
                    return; // shouldn't happen for a well-formed seed path
                }
                const { parent, name } = result;
                const localNode = parent.children[name];
                const lastSynced = updatedSync[path];

                if (localNode && lastSynced === undefined) {
                    // First time this path has ever been reconciled (e.g.
                    // a profile created before this feature existed, or a
                    // brand new profile) - there's nothing to "update" to,
                    // the file already reflects whatever the code shipped
                    // when it was created. Just establish the baseline so
                    // future version bumps have something to compare
                    // against, without firing a spurious change here.
                    updatedSync[path] = freshNode.seedVersion;
                    return;
                }

                if (localNode && lastSynced >= freshNode.seedVersion) {
                    // Already at (or past) the shipped version - nothing to do.
                    return;
                }

                // Missing, or behind the shipped version - (re)write it
                // from the fresh seed content, regardless of whether it's
                // missing because it was never here, was deleted, or was
                // edited. structuredClone since it'll be mutated in-place
                // going forward (accessed/modified timestamps etc.) and
                // shouldn't share references with freshTree.
                const isNew = !localNode;
                parent.children[name] = structuredClone(freshNode);
                parent.modified = Date.now();
                updatedSync[path] = freshNode.seedVersion;
                changes.push({ path, action: isNew ? "added" : "updated" });
            });

            return { seedSync: updatedSync, changes };
        }

    };

    /**
     * Read/write handlers for the virtual device files under /dev,
     * mirroring standard Unix device semantics: /dev/null discards writes
     * and reads as empty, /dev/zero reads as null bytes, /dev/random and
     * /dev/urandom read as random bytes, /dev/full reads as null bytes but
     * always refuses writes (simulating a full disk). All other writes
     * succeed silently, same as their real counterparts.
     */
    function generateRandomBytes(count) {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let output = "";

        for (let i = 0; i < count; i++) {
            output += chars[Math.floor(Math.random() * chars.length)];
        }

        return output;
    }

    window.FileDevices = {
        null: {
            read() {
                return "";
            },
            write(data) {
                return true;
            }
        },

        zero: {
            read(count = 4096) {
                return "\0".repeat(count);
            },
            write(data) {
                return true;
            }
        },

        random: {
            read(count = 4096) {
                return generateRandomBytes(count);
            },

            write(data) {
                return true;
            }
        },

        urandom: {
            read(count = 4096) {
                return generateRandomBytes(count);
            },

            write(data) {
                return true;
            }
        },

        // /dev/full - reads like /dev/zero, but every write fails (as if the
        // disk were completely out of space). Useful for testing how a
        // program handles a failed write.
        full: {
            read(count = 4096) {
                return "\0".repeat(count);
            },
            write(data) {
                return false;
            }
        }
    };
})();
