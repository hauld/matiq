export const chains = {
    demo_agent: `prompt("demo_agent");`,
    set_goal: `prompt("set_goal");`,
    select_task: `if(promptContext.goal){prompt("next_goal");} else {prompt("next_task");}`
}

export const agents = {
    demo: {
        sys_chain: "demo_agent",
    }
}

export const prompts = {
    demo_agent: "You will assist to determine the suitable tasks can be executed to achieve the goals set by user. The available tasks are:\
    ${tasks}\
    Let's ask me a goal to be achievied.",
    set_goal: "Let's ask me a goal to be achievied.",
    next_goal: "The goal is: ${goal}. Let's identify the  tasks list would be executed to achieve the goal. Response the first task info with json format as follow { task_name: \"name\", args: [...list of arguments]}.",
    next_task: "The given task is completed and produced a result ${result}. Let's check if the result has met the goal. If yes response a json object { welldone: true }. Otherwise let's identify the next task to be executed, response the task info with json format as follow { task_name: \"name\", args: [...list of arguments]}."
}