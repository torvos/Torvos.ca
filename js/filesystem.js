window.FileSystem = {

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
                                content: `This site is a terminal emulator, commands aren't run on an actual server everything is done locally on your device including the filesystem.`}
                        }                            
                    }
                }
            }
        }
    }
};

window.FileSystemAPI = {

    get(path, cwd = "/") {
        const fullPath = resolveRelativePath(cwd, path);
        const result = resolvePath(fullPath);

        if (!result || !result.node) {
            return null;
        }

        return result.node;
    },

    getFullPath(path, cwd = "/") {
        const fullPath = resolveRelativePath(cwd, path);
        if (!fullPath) {
            return null;
        }
        return fullPath;
    },

    isInBin(path, cwd = "/") {
        const fullPath = resolveRelativePath(cwd, path);
        return fullPath.includes("/bin/");
    }

};

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
            const chars =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            let output = "";

            for (let i = 0; i < count; i++) {
                output += chars[Math.floor(Math.random() * chars.length)];
            }

            return output;
        },

        write(data) {
            return true;
        }
    }
};