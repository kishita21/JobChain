



'use strict';

const { Contract } = require('fabric-contract-api');

class JobContract extends Contract {

    async CreateJob(ctx, jobId, title, company, location, salary, description) {

        const exists = await ctx.stub.getState(jobId);

        if (exists && exists.length > 0) {
            throw new Error('Job already exists');
        }

        const job = {
            jobId,
            title,
            company,
            location,
            salary,
            description,
            status: 'OPEN',
            applications: [],
            createdAt: new Date(Number(ctx.stub.getTxTimestamp().seconds.toString()) * 1000 + Math.floor(ctx.stub.getTxTimestamp().nanos / 1000000)).toISOString()
        };

        await ctx.stub.putState(
            jobId,
            Buffer.from(JSON.stringify(job))
        );

        return JSON.stringify(job);
    }

    async GetJob(ctx, jobId) {
        const data = await ctx.stub.getState(jobId);

        if (!data || data.length === 0) {
            throw new Error('Job not found');
        }

        return data.toString();
    }

    async GetAllJobs(ctx) {
        const iterator = await ctx.stub.getStateByRange('', '');
        const jobs = [];

        let result = await iterator.next();

        while (!result.done) {
            try {
                const job = JSON.parse(
                    result.value.value.toString()
                );

                if (job.jobId) jobs.push(job);
            } catch (error) {}

            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(jobs);
    }

    async ApplyForJob(ctx, jobId, applicationId, applicantName, email, skills) {

        const data = await ctx.stub.getState(jobId);

        if (!data || data.length === 0) {
            throw new Error('Job not found');
        }

        const job = JSON.parse(data.toString());

        if (job.status !== 'OPEN') {
            throw new Error('Job is closed');
        }

        const application = {
            applicationId,
            applicantName,
            email,
            skills,
            status: 'SUBMITTED',
            appliedAt: new Date(Number(ctx.stub.getTxTimestamp().seconds.toString()) * 1000 + Math.floor(ctx.stub.getTxTimestamp().nanos / 1000000)).toISOString()
        };

        job.applications.push(application);

        await ctx.stub.putState(
            jobId,
            Buffer.from(JSON.stringify(job))
        );

        return JSON.stringify(application);
    }

    async GetApplications(ctx, jobId) {
        const data = await ctx.stub.getState(jobId);

        if (!data || data.length === 0) {
            throw new Error('Job not found');
        }

        const job = JSON.parse(data.toString());

        return JSON.stringify(job.applications);
    }
}

module.exports = JobContract;

