import { getMiningRecords, updateMiningRecord } from './supabaseMiningStore';
import { updateUserBalance } from './supabaseBalanceStore';

/**
 * Processes daily mining rewards for a user.
 * Checks each mining record to see if 24 hours have passed since the last withdrawal/update.
 * If so, calculates the days passed and credits the balance.
 * 
 * @param userId The ID of the user to process rewards for
 * @returns Object containing the total amount credited and number of records processed
 */
export async function processMiningRewards(userId: string): Promise<{
  amountCredited: number;
  recordsProcessed: number;
}> {
  try {
    const records = await getMiningRecords(userId);
    let amountCredited = 0;
    let recordsProcessed = 0;

    const now = new Date();

    for (const record of records) {
      // Determine the reference time for calculation:
      // Use lastWithdrawal if it exists and is valid, otherwise use startDate
      // We look for "last update" time. 
      // If lastWithdrawal is set, it means rewards were claimed/processed up to that point.
      // If not, we start from startDate.
      const lastUpdateTimeString = record.lastWithdrawal || record.startDate;
      const lastUpdateTime = new Date(lastUpdateTimeString);
      
      // Calculate hours passed
      const diffMs = now.getTime() - lastUpdateTime.getTime();
      const hoursPassed = diffMs / (1000 * 60 * 60);

      // Check if at least 24 hours have passed
      if (hoursPassed >= 24) {
        // Calculate full days passed
        const daysPassed = Math.floor(hoursPassed / 24);
        
        if (daysPassed > 0) {
          const rewardAmount = record.dailyYield * daysPassed;
          
          // Update total earnings for the record
          const newTotalEarnings = (record.totalEarnings || 0) + rewardAmount;
          
          // Calculate new last updated time (add exact days to previous time to avoid drift)
          // or just set to now?
          // Setting to 'now' resets the 24h timer from this moment. 
          // Adding exactly 24h * days keeps the cycle strictly daily.
          // Let's stick to strict cycles: previousTime + (days * 24h)
          const newLastWithdrawalTime = new Date(lastUpdateTime.getTime() + (daysPassed * 24 * 60 * 60 * 1000));

          // Update the mining record
          await updateMiningRecord(record.id, {
            totalEarnings: newTotalEarnings,
            lastWithdrawal: newLastWithdrawalTime.toISOString(),
            // Update next withdrawal time
            nextWithdrawal: new Date(newLastWithdrawalTime.getTime() + (24 * 60 * 60 * 1000)).toISOString()
          });

          // Credit the user's balance
          await updateUserBalance(userId, rewardAmount);

          amountCredited += rewardAmount;
          recordsProcessed++;
        }
      }
    }

    return { amountCredited, recordsProcessed };
  } catch (error) {
    console.error(`Error processing mining rewards for user ${userId}:`, error);
    throw error;
  }
}
