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

(function() {
    function resolvePath(path, depth = 0) {
        if (depth > 20) {return null;}
        const parts = path.replace("~", "").split(ROOT).filter(Boolean);
        let node = window.FileSystem[ROOT];
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

    function resolveRelativePath(cwd, path) {
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

    function getParentDirectory(path) {
        const parts = path.split(ROOT).filter(Boolean);
        if (parts.length === 0) {return null;}
        const name = parts.pop();
        let parent = window.FileSystem[ROOT];
        for (const part of parts) {
            if (!parent.children || !parent.children[part]) {return null;}
            parent = parent.children[part];
            if (parent.type !== "dir") {return null;}
        }
        return {parent,name};
    }

    function numericToMode(value) {
        value = value.slice(-3);
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

    function getDirectorySize(node) {
        if (!node) {
            return 0;
        }
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        let total = 0;
        for (const child of Object.values(node.children || {})) {
            total += window.getDirectorySize(child);
        }
        return total;
    }

    function getSize(node) {
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        if (node.type === "dir") {
            return Object.keys(node.children || {}).length;
        }
        return 0;
    }

    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleString("en-CA", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    function getLinkCount(node) {
        if (node.type === "file") {
            return 1;
        }
        const subdirs = Object.values(node.children || {})
            .filter(child => child.type === "dir")
            .length;
        return 2 + subdirs;
    }

    function formatLongEntry(name, node) {
        const typeChar = node.type === "dir" ? "d" : node.type === "symlink" ? "l" : node.type === "device" ? "c" : "-";
        const mode = node.mode;
        const links = window.getLinkCount(node);
        const group = node.group;
        const size = window.getDirectorySize(node);
        const modified = window.formatDate(node.modified);    const owner = node.owner;
        return `${typeChar}${mode} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${String(size).padStart(6)} ${modified} ${name}${node.type === "dir" ? "/" : ""}${node.type === "symlink" ? ` -> ${node.target}` : ""}`;
    }

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

    function expandWildcards(arg, cwd = "/") {
        if (!arg.includes("*") && !arg.includes("?")) {
            return [arg];
        }
        const results = [];
        const pattern = arg.startsWith("/")
            ? arg
            : resolveRelativePath(cwd, arg);
        const parts = pattern.split("/");

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
                for (const name of Object.keys(node.children)) {
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
        let startNode = window.FileSystem["/"];
        walk(
            startNode,
            0,
            ""
        );
        return results;
    }

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
        },

        resolve(path, cwd = "/") {
            const fullPath = resolveRelativePath(cwd, path);
            return resolvePath(fullPath);
        },
        
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
})();
